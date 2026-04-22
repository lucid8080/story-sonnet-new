import prisma from '@/lib/prisma';
import {
  parseJsonToBrief,
  parseJsonToScriptPackage,
  type BriefPayloadParsed,
  type ScriptPackagePayloadParsed,
} from '@/lib/story-studio/schemas/llm-output';
import {
  buildDraftCoverImagePrompt,
  buildOpenRouterMessagesForBrief,
  buildOpenRouterMessagesForScript,
} from '@/lib/story-studio/prompt-builder';
import { resolveDraftGenerationRequest } from '@/lib/story-studio/normalize-request';
import { getArtStylePromptOverrides } from '@/lib/story-studio/story-studio-settings';
import { sunoGenerateTheme } from '@/lib/story-studio/vendors/suno';
import {
  executeImageGeneration,
  executeNarrationGeneration,
  executeTextGeneration,
} from '@/lib/generation/execute';
import {
  getDefaultStorageBucket,
  getPrivateAudioBucket,
  getPrivateAudioObjectBuffer,
  uploadPrivateAudioObject,
} from '@/lib/s3';
import { uploadOriginalPlusDisplayWebp } from '@/lib/images/dualPublicImageUpload';
import {
  buildCoverKey,
  buildPrivateAudioKey,
  makeUniqueSafeFileName,
  sanitizeUploadFileName,
} from '@/lib/media-upload-keys';
import { trimAudioToBuffer } from '@/lib/story-studio/audio/trim-intro';
import { STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE } from '@/lib/story-studio/constants';
import { draftSlugFromTitle } from '@/lib/story-studio/draft-slug-from-title';
import type { GenerationJobStep } from '@/lib/story-studio/types';
import {
  syncLinkedLibraryFromDraft,
  type SyncLinkedLibraryResult,
} from '@/lib/story-studio/sync-linked-library-from-draft';

export type ExecuteGenerationStepResult = {
  assetId?: string;
  librarySync?: SyncLinkedLibraryResult;
};

const ALLOWED_STEPS: GenerationJobStep[] = [
  'brief',
  'script',
  'cover',
  'theme_full',
  'theme_intro',
  'tts',
  'package',
];

function assertStep(s: string): asserts s is GenerationJobStep {
  if (!ALLOWED_STEPS.includes(s as GenerationJobStep)) {
    throw new Error(`Unknown generation step: ${s}`);
  }
}

async function createJob(draftId: string, step: GenerationJobStep) {
  return prisma.storyStudioGenerationJob.create({
    data: {
      draftId,
      step,
      status: 'running',
      startedAt: new Date(),
      attempts: 1,
    },
  });
}

function draftTitleAndSlugFromSeriesOrWorkTitle(options: {
  seriesTitle: string;
  workTitle: string;
}): { title: string; slug: string } {
  const st = options.seriesTitle.trim();
  if (st.length > 0) {
    return { title: st, slug: draftSlugFromTitle(st) };
  }
  const t = options.workTitle.trim() || 'Untitled draft';
  return { title: t, slug: draftSlugFromTitle(t) };
}

async function finishJob(
  jobId: string,
  status: 'succeeded' | 'failed',
  errorMessage?: string,
  resultRef?: string
) {
  await prisma.storyStudioGenerationJob.update({
    where: { id: jobId },
    data: {
      status,
      finishedAt: new Date(),
      errorMessage: errorMessage ?? null,
      resultRef: resultRef ?? null,
    },
  });
}

async function persistScriptEpisodes(
  draftId: string,
  pkg: ScriptPackagePayloadParsed
) {
  await prisma.$transaction(async (tx) => {
    await tx.storyStudioDraftEpisode.deleteMany({ where: { draftId } });
    for (let i = 0; i < pkg.episodes.length; i++) {
      const ep = pkg.episodes[i];
      await tx.storyStudioDraftEpisode.create({
        data: {
          draftId,
          sortOrder: i,
          title: ep.title,
          scriptText: ep.scriptText,
          summary: ep.summary || null,
        },
      });
    }
    const meta = draftTitleAndSlugFromSeriesOrWorkTitle({
      seriesTitle: pkg.seriesTitle,
      workTitle: pkg.title,
    });
    await tx.storyStudioDraft.update({
      where: { id: draftId },
      data: {
        scriptPackage: pkg as object,
        title: meta.title,
        slug: meta.slug,
      },
    });
  });
}

function normalizeScriptPackage(
  pkg: ScriptPackagePayloadParsed
): ScriptPackagePayloadParsed {
  let episodes = [...pkg.episodes];
  if (!episodes.length && pkg.fullScript?.trim()) {
    episodes = [
      {
        title: pkg.title,
        summary: pkg.summary,
        scriptText: pkg.fullScript.trim(),
      },
    ];
  }
  return { ...pkg, episodes };
}

function assertEpisodeScriptCharLimits(pkg: ScriptPackagePayloadParsed) {
  const max = STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE;
  pkg.episodes.forEach((ep, i) => {
    const n = ep.scriptText.length;
    if (n > max) {
      throw new Error(
        `Episode ${i + 1} script exceeds character limit: ${n} characters (max ${max}). Regenerate or shorten the script.`
      );
    }
  });
}

async function loadDraftFull(draftId: string) {
  return prisma.storyStudioDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: {
      preset: true,
      episodes: { orderBy: { sortOrder: 'asc' } },
      assets: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export type ExecuteGenerationStepOptions = {
  /** When set with step `tts`, narrate only this draft episode; replaces prior `episode_audio` rows for it. */
  draftEpisodeId?: string | null;
};

/** Core step logic (no job row). */
export async function executeGenerationStep(
  draftId: string,
  step: GenerationJobStep,
  opts?: ExecuteGenerationStepOptions
): Promise<ExecuteGenerationStepResult | void> {
  if (step === 'package') {
    const draft = await loadDraftFull(draftId);
    const req = resolveDraftGenerationRequest(draft);
    await executeGenerationStep(draftId, 'brief');
    await executeGenerationStep(draftId, 'script');
    if (req.generateCover) await executeGenerationStep(draftId, 'cover');
    if (req.generateTheme) {
      await executeGenerationStep(draftId, 'theme_full');
      await executeGenerationStep(draftId, 'theme_intro');
    }
    if (req.generateAudio) {
      const ttsResult = await executeGenerationStep(draftId, 'tts');
      if (ttsResult?.librarySync) {
        return { librarySync: ttsResult.librarySync };
      }
    }
    return;
  }

  const draft = await loadDraftFull(draftId);
  const req = resolveDraftGenerationRequest(draft);
  const artStyleOverrides = await getArtStylePromptOverrides(prisma);

  if (step === 'brief') {
    const varietySeed = `${Date.now().toString(36)}-${Math.floor(
      Math.random() * 1_000_000_000
    ).toString(36)}`;
    const messages = buildOpenRouterMessagesForBrief(req, {
      varietySeed,
      artStyleOverrides,
    });
    const { content: raw } = await executeTextGeneration({
      toolKey: 'story_studio_generate_brief',
      messages,
      temperature: 0.92,
      maxTokens: undefined,
    });
    const parsed = parseJsonToBrief(raw);
    if (!parsed.success) {
      throw new Error(
        `Brief JSON invalid: ${parsed.error.message.slice(0, 300)}`
      );
    }
    const meta = draftTitleAndSlugFromSeriesOrWorkTitle({
      seriesTitle: parsed.data.seriesTitle,
      workTitle: parsed.data.title,
    });
    await prisma.storyStudioDraft.update({
      where: { id: draftId },
      data: {
        brief: parsed.data as object,
        title: meta.title,
        slug: meta.slug,
      },
    });
    return;
  }

  if (step === 'script') {
    const briefData = draft.brief as BriefPayloadParsed | null;
    if (!briefData) {
      throw new Error('Generate a brief first (or run full package).');
    }
    const messages = buildOpenRouterMessagesForScript(
      req,
      briefData,
      artStyleOverrides
    );
    const { content: raw } = await executeTextGeneration({
      toolKey: 'story_studio_generate_script',
      messages,
      maxTokens: 12000,
      temperature: undefined,
    });
    const parsed = parseJsonToScriptPackage(raw);
    if (!parsed.success) {
      throw new Error(
        `Script JSON invalid: ${parsed.error.message.slice(0, 300)}`
      );
    }
    const normalized = normalizeScriptPackage(parsed.data);
    if (!normalized.episodes.length) {
      throw new Error('Script has no episodes and no fullScript.');
    }
    assertEpisodeScriptCharLimits(normalized);
    await persistScriptEpisodes(draftId, normalized);
    return;
  }

  const scriptPkg = draft.scriptPackage as ScriptPackagePayloadParsed | null;
  const brief = draft.brief as BriefPayloadParsed | null;

  if (step === 'cover') {
    const draftPrompt = req.coverImagePromptDraft?.trim();
    const prompt =
      draftPrompt && draftPrompt.length > 0
        ? draftPrompt
        : buildDraftCoverImagePrompt(req, draft, artStyleOverrides);
    const { result: img } = await executeImageGeneration({
      toolKey: 'story_studio_generate_cover',
      prompt,
    });
    if (!img.ok) {
      throw new Error(img.message);
    }
    const bucket = getDefaultStorageBucket();
    if (!bucket) {
      throw new Error('Public storage bucket not configured (R2_BUCKET).');
    }
    const safeName = makeUniqueSafeFileName(
      sanitizeUploadFileName('cover.png')
    );
    // Unique per draft — shared slugs (e.g. untitled-draft) would otherwise map to one object key and one image for all.
    const key = buildCoverKey({
      storySlug: `studio-draft-${draftId}`,
      safeFileName: safeName,
    });
    const dual = await uploadOriginalPlusDisplayWebp({
      bucket,
      originalKey: key,
      body: img.imageBuffer,
      originalContentType: img.mimeType,
      preset: 'cover',
    });
    const asset = await prisma.storyStudioGeneratedAsset.create({
      data: {
        draftId,
        kind: 'cover',
        publicUrl: dual.displayUrl,
        storageKey: dual.displayKey,
        mimeType: 'image/webp',
        vendor: 'story-studio-image',
        metadata: {
          imagePrompt: prompt,
          originalMimeType: img.mimeType,
          originalPublicUrl: dual.originalUrl,
          originalStorageKey: dual.originalKey,
        },
      },
    });
    return { assetId: asset.id };
  }

  if (step === 'theme_full') {
    const musicPrompt =
      scriptPkg?.musicPrompt ??
      brief?.musicPrompt ??
      'Soft instrumental theme for kids.';
    const suno = await sunoGenerateTheme({
      prompt: musicPrompt,
      title: scriptPkg?.title ?? draft.title,
    });
    if (!suno.ok) {
      throw new Error(suno.message);
    }
    const bucket = getPrivateAudioBucket();
    if (!bucket) {
      throw new Error('Private audio bucket not configured.');
    }
    let buffer: Buffer | null = null;
    if (suno.audioUrl) {
      const r = await fetch(suno.audioUrl);
      if (r.ok) buffer = Buffer.from(await r.arrayBuffer());
    }
    const key = buildPrivateAudioKey({
      storySlug: draft.slug,
      subPathSegments: ['music', 'full_song'],
      safeFileName: sanitizeUploadFileName('theme.mp3'),
    });
    if (buffer?.length) {
      await uploadPrivateAudioObject({
        bucket,
        key,
        body: buffer,
        contentType: 'audio/mpeg',
      });
    }
    const asset = await prisma.storyStudioGeneratedAsset.create({
      data: {
        draftId,
        kind: 'theme_full',
        storageKey: buffer?.length ? key : null,
        mimeType: 'audio/mpeg',
        vendor: 'suno',
        vendorArtifactId: suno.jobId,
        metadata: JSON.parse(
          JSON.stringify({
            raw: suno.raw,
            pendingDownload: !buffer?.length,
          })
        ),
      },
    });
    return { assetId: asset.id };
  }

  if (step === 'theme_intro') {
    const full = draft.assets.find((a) => a.kind === 'theme_full');
    const bucket = getPrivateAudioBucket();
    if (!bucket) throw new Error('Private audio bucket not configured.');
    let input: Buffer | null = null;
    if (full?.storageKey) {
      input = await getPrivateAudioObjectBuffer(full.storageKey);
    }
    if (!input?.length) {
      throw new Error(
        'No theme_full audio in storage. Run theme_full with a provider that returns downloadable audio, or upload manually.'
      );
    }
    const introSeconds = Math.min(30, Math.max(8, 15));
    const trimmed = await trimAudioToBuffer({
      inputBuffer: input,
      durationSeconds: introSeconds,
    });
    if (!trimmed.ok) {
      throw new Error(trimmed.message);
    }
    const introKey = buildPrivateAudioKey({
      storySlug: draft.slug,
      subPathSegments: ['music', 'Intro_song'],
      safeFileName: sanitizeUploadFileName('theme.mp3'),
    });
    await uploadPrivateAudioObject({
      bucket,
      key: introKey,
      body: trimmed.buffer,
      contentType: 'audio/mpeg',
    });
    const asset = await prisma.storyStudioGeneratedAsset.create({
      data: {
        draftId,
        kind: 'theme_intro',
        storageKey: introKey,
        mimeType: 'audio/mpeg',
        vendor: 'ffmpeg-trim',
      },
    });
    return { assetId: asset.id };
  }

  if (step === 'tts') {
    const d = await prisma.storyStudioDraft.findUniqueOrThrow({
      where: { id: draftId },
      include: { episodes: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!d.episodes.length) {
      throw new Error('No draft episodes — generate script first.');
    }
    const bucket = getPrivateAudioBucket();
    if (!bucket) throw new Error('Private audio bucket not configured.');

    const singleEpisodeId = opts?.draftEpisodeId?.trim() || null;
    const episodesToSynthesize = singleEpisodeId
      ? d.episodes.filter((e) => e.id === singleEpisodeId)
      : d.episodes;

    if (singleEpisodeId && episodesToSynthesize.length === 0) {
      throw new Error('Episode not found on this draft.');
    }

    if (singleEpisodeId) {
      await prisma.storyStudioGeneratedAsset.deleteMany({
        where: {
          draftId,
          draftEpisodeId: singleEpisodeId,
          kind: 'episode_audio',
        },
      });
    }

    for (let i = 0; i < episodesToSynthesize.length; i++) {
      const ep = episodesToSynthesize[i];
      const { result: tts } = await executeNarrationGeneration({
        toolKey: 'story_studio_narration',
        text: ep.scriptText,
      });
      if (!tts.ok) {
        throw new Error(tts.message);
      }
      const epIndex = d.episodes.findIndex((e) => e.id === ep.id);
      const n = epIndex >= 0 ? epIndex + 1 : i + 1;
      const key = buildPrivateAudioKey({
        storySlug: draft.slug,
        safeFileName: makeUniqueSafeFileName(
          sanitizeUploadFileName(`episode-${n}.mp3`)
        ),
      });
      await uploadPrivateAudioObject({
        bucket,
        key,
        body: tts.audioBuffer,
        contentType: tts.mimeType,
      });
      await prisma.storyStudioGeneratedAsset.create({
        data: {
          draftId,
          draftEpisodeId: ep.id,
          kind: 'episode_audio',
          storageKey: key,
          mimeType: tts.mimeType,
          vendor: 'elevenlabs',
        },
      });
    }

    const librarySync = await syncLinkedLibraryFromDraft(draftId);
    if (!librarySync.ok) {
      console.error(
        '[story-studio/tts-library-sync]',
        draftId,
        librarySync.message
      );
    }
    return { librarySync };
  }

  throw new Error(`Unhandled step: ${step}`);
}

export async function runStoryStudioStep(
  draftId: string,
  stepRaw: string,
  opts?: ExecuteGenerationStepOptions
): Promise<{
  jobId: string;
  ok: true;
  librarySync?: SyncLinkedLibraryResult;
}> {
  assertStep(stepRaw);
  const step = stepRaw;

  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: draftId },
  });
  if (!draft) {
    throw new Error('Draft not found');
  }

  const job = await createJob(draftId, step);

  try {
    const result = await executeGenerationStep(draftId, step, opts);
    await finishJob(
      job.id,
      'succeeded',
      undefined,
      result && 'assetId' in result && result.assetId
        ? result.assetId
        : undefined
    );
    return {
      jobId: job.id,
      ok: true as const,
      ...(result?.librarySync !== undefined
        ? { librarySync: result.librarySync }
        : {}),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await finishJob(job.id, 'failed', msg);
    throw e;
  }
}
