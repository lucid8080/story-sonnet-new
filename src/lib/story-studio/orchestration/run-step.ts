import prisma from '@/lib/prisma';
import {
  parseJsonToBrief,
  parseJsonToScriptPackage,
  type BriefPayloadParsed,
  type ScriptPackagePayloadParsed,
} from '@/lib/story-studio/schemas/llm-output';
import {
  buildCoverImagePrompt,
  buildOpenRouterMessagesForBrief,
  buildOpenRouterMessagesForScript,
} from '@/lib/story-studio/prompt-builder';
import { openRouterChatCompletion } from '@/lib/story-studio/openrouter';
import { resolveDraftGenerationRequest } from '@/lib/story-studio/normalize-request';
import { elevenLabsTextToSpeech } from '@/lib/story-studio/vendors/elevenlabs';
import { sunoGenerateTheme } from '@/lib/story-studio/vendors/suno';
import { generateStoryCoverImage } from '@/lib/story-studio/vendors/image-generation';
import {
  getDefaultStorageBucket,
  getPrivateAudioBucket,
  getPrivateAudioObjectBuffer,
  uploadPrivateAudioObject,
  uploadPublicObject,
} from '@/lib/s3';
import {
  buildCoverKey,
  buildPrivateAudioKey,
  sanitizeUploadFileName,
} from '@/lib/media-upload-keys';
import { trimAudioToBuffer } from '@/lib/story-studio/audio/trim-intro';
import { STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE } from '@/lib/story-studio/constants';
import type { GenerationJobStep } from '@/lib/story-studio/types';

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
    await tx.storyStudioDraft.update({
      where: { id: draftId },
      data: {
        scriptPackage: pkg as object,
        title: pkg.title,
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

/** Core step logic (no job row). */
export async function executeGenerationStep(
  draftId: string,
  step: GenerationJobStep
): Promise<{ assetId?: string } | void> {
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
    if (req.generateAudio) await executeGenerationStep(draftId, 'tts');
    return;
  }

  const draft = await loadDraftFull(draftId);
  const req = resolveDraftGenerationRequest(draft);

  if (step === 'brief') {
    const messages = buildOpenRouterMessagesForBrief(req);
    const raw = await openRouterChatCompletion({ messages });
    const parsed = parseJsonToBrief(raw);
    if (!parsed.success) {
      throw new Error(
        `Brief JSON invalid: ${parsed.error.message.slice(0, 300)}`
      );
    }
    await prisma.storyStudioDraft.update({
      where: { id: draftId },
      data: {
        brief: parsed.data as object,
        title: parsed.data.title,
      },
    });
    return;
  }

  if (step === 'script') {
    const briefData = draft.brief as BriefPayloadParsed | null;
    if (!briefData) {
      throw new Error('Generate a brief first (or run full package).');
    }
    const messages = buildOpenRouterMessagesForScript(req, briefData);
    const raw = await openRouterChatCompletion({
      messages,
      maxTokens: 12000,
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
  const coverPrompt =
    scriptPkg?.coverArtPrompt ?? brief?.coverArtPrompt ?? draft.title;

  if (step === 'cover') {
    const prompt = buildCoverImagePrompt(req, coverPrompt);
    const img = await generateStoryCoverImage({ prompt });
    if (!img.ok) {
      throw new Error(img.message);
    }
    const bucket = getDefaultStorageBucket();
    if (!bucket) {
      throw new Error('Public storage bucket not configured (R2_BUCKET).');
    }
    const safeName = sanitizeUploadFileName('cover.png');
    const key = buildCoverKey({
      storySlug: draft.slug,
      safeFileName: safeName,
    });
    const { url } = await uploadPublicObject({
      bucket,
      key,
      body: img.imageBuffer,
      contentType: img.mimeType,
    });
    const asset = await prisma.storyStudioGeneratedAsset.create({
      data: {
        draftId,
        kind: 'cover',
        publicUrl: url,
        storageKey: key,
        mimeType: img.mimeType,
        vendor: 'story-studio-image',
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
    const voiceId = req.elevenLabsVoiceId;
    const bucket = getPrivateAudioBucket();
    if (!bucket) throw new Error('Private audio bucket not configured.');

    for (let i = 0; i < d.episodes.length; i++) {
      const ep = d.episodes[i];
      // #region agent log
      fetch('http://127.0.0.1:7434/ingest/678f1997-b99a-405b-943f-eded3c164e8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f4563a'},body:JSON.stringify({sessionId:'f4563a',runId:'slug-path-pre',hypothesisId:'H3_H5',location:'run-step.ts:tts:key-build',message:'Building TTS storage key',data:{draftId,loopIndex:i,draftSlugFromStep:draft.slug,draftSlugFromQuery:d.slug,draftTitleFromStep:draft.title},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const tts = await elevenLabsTextToSpeech({
        text: ep.scriptText,
        voiceId,
      });
      if (!tts.ok) {
        throw new Error(tts.message);
      }
      const n = i + 1;
      const key = buildPrivateAudioKey({
        storySlug: draft.slug,
        safeFileName: sanitizeUploadFileName(`episode-${n}.mp3`),
      });
      // #region agent log
      fetch('http://127.0.0.1:7434/ingest/678f1997-b99a-405b-943f-eded3c164e8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f4563a'},body:JSON.stringify({sessionId:'f4563a',runId:'slug-path-pre',hypothesisId:'H5',location:'run-step.ts:tts:key-built',message:'Built TTS storage key',data:{draftId,loopIndex:i,key},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
    return;
  }

  throw new Error(`Unhandled step: ${step}`);
}

export async function runStoryStudioStep(draftId: string, stepRaw: string) {
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
    const result = await executeGenerationStep(draftId, step);
    await finishJob(
      job.id,
      'succeeded',
      undefined,
      result && 'assetId' in result ? result.assetId : undefined
    );
    return { jobId: job.id, ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await finishJob(job.id, 'failed', msg);
    throw e;
  }
}
