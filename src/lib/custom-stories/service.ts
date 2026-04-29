import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  CUSTOM_STORY_STATUS,
  priceCentsForPackage,
  resolveEpisodeCountForPackage,
  type CustomStoryPackageType,
} from '@/lib/custom-stories/config';
import {
  type CustomStoryInputs,
  type CreateCustomStoryOrderInput,
  orderInputToGenerationPatch,
} from '@/lib/custom-stories/schemas';
import { defaultGenerationRequest, mergeGenerationRequest } from '@/lib/story-studio/normalize-request';
import { draftSlugFromTitle } from '@/lib/story-studio/draft-slug-from-title';
import { executeImageGeneration, executeNarrationGeneration, executeTextGeneration } from '@/lib/generation/execute';
import { uploadPrivateAudioObject, uploadPublicObject, getDefaultStorageBucket, getPrivateAudioBucket } from '@/lib/s3';
import { scriptToTranscriptLines } from '@/lib/transcripts/from-script';

type StoryPlan = {
  title: string;
  summary: string;
  episodePlans: Array<{ title: string; synopsis: string }>;
};

type EpisodeGenerated = {
  episodeNumber: number;
  title: string;
  synopsis: string;
  scriptText: string;
  durationLabel: string;
  durationSeconds: number;
  audioStorageKey: string;
  transcriptLines: ReturnType<typeof scriptToTranscriptLines>;
};

function scrubFreeText(raw: string): string {
  return raw.replace(/[<>]/g, '').trim();
}

export function deriveSeriesTitleFromSimpleIdea(simpleIdea: string): string {
  const cleaned = scrubFreeText(simpleIdea).replace(/\s+/g, ' ');
  if (!cleaned) return 'My Custom Story';
  const base = cleaned.length > 64 ? `${cleaned.slice(0, 64).trim()}...` : cleaned;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function sanitizeInputs(inputs: CustomStoryInputs): CustomStoryInputs {
  const safeSimpleIdea = scrubFreeText(inputs.simpleIdea);
  const derivedTitle = deriveSeriesTitleFromSimpleIdea(safeSimpleIdea);
  const safeTitle = scrubFreeText(inputs.title || '') || derivedTitle;
  const safeSlug = draftSlugFromTitle(inputs.storySlug || safeTitle);
  return {
    ...inputs,
    title: safeTitle,
    storySlug: safeSlug,
    simpleIdea: safeSimpleIdea,
    studioSetup: {
      ...inputs.studioSetup,
      customArtStyle: scrubFreeText(inputs.studioSetup.customArtStyle),
    },
  };
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function priceForOrderInput(input: CreateCustomStoryOrderInput): {
  packageType: CustomStoryPackageType;
  episodeCount: number;
  priceCents: number;
} {
  const packageType = input.packageType;
  const episodeCount = resolveEpisodeCountForPackage(packageType, input.episodeCount ?? null);
  const priceCents = priceCentsForPackage(packageType, episodeCount);
  return { packageType, episodeCount, priceCents };
}

export async function createCustomStoryOrder(userId: string, input: CreateCustomStoryOrderInput) {
  const normalizedInputs = sanitizeInputs(input);
  const pricing = priceForOrderInput(input);
  const requestPatch = orderInputToGenerationPatch(normalizedInputs);
  const request = mergeGenerationRequest(defaultGenerationRequest(), {
    ...requestPatch,
    format: pricing.episodeCount > 1 ? 'mini-series' : 'standalone',
    targetLengthRange: '4-5',
    episodeCount: pricing.episodeCount,
  } as any);
  const draftTitle = normalizedInputs.title.trim() || deriveSeriesTitleFromSimpleIdea(normalizedInputs.simpleIdea);

  return prisma.$transaction(async (tx) => {
    const draft = await tx.storyStudioDraft.create({
      data: {
        seriesTitle: draftTitle,
        slug: draftSlugFromTitle(normalizedInputs.storySlug || draftTitle),
        mode: 'quick',
        request: request as unknown as Prisma.InputJsonValue,
        createdByUserId: userId,
      },
    });
    return tx.customStoryOrder.create({
      data: {
        userId,
        packageType: pricing.packageType,
        episodeCount: pricing.episodeCount,
        priceCents: pricing.priceCents,
        nfcRequested: !!normalizedInputs.nfcRequested,
        inputs: normalizedInputs as unknown as Prisma.InputJsonValue,
        status: CUSTOM_STORY_STATUS.DRAFT,
        storyStudioDraftId: draft.id,
      },
    });
  });
}

export async function listCustomStoryOrdersForUser(userId: string) {
  return prisma.customStoryOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCustomStoryOrderForUser(orderId: string, userId: string) {
  return prisma.customStoryOrder.findFirst({
    where: { id: orderId, userId },
  });
}

export async function getCustomStoryOrderByStripeSessionId(stripeSessionId: string) {
  return prisma.customStoryOrder.findFirst({
    where: { stripeSessionId },
  });
}

export async function generateCustomStoryFromOrder(order: { id: string; storyId: bigint | null; inputs: unknown; episodeCount: number; status: string }): Promise<{ storyId: bigint }> {
  if (order.storyId) return { storyId: order.storyId };
  const safeInputs = (order.inputs ?? {}) as Record<string, unknown>;

  await prisma.customStoryOrder.update({
    where: { id: order.id },
    data: { status: CUSTOM_STORY_STATUS.GENERATING, generationError: null },
  });

  try {
    const plan = await generateStoryPlan(safeInputs, order.episodeCount);
    const slugSeed = draftSlugFromTitle(`${plan.title}-${order.id.slice(0, 6)}`);
    const storySlug = `custom-${slugSeed}`;
    const generatedEpisodes: EpisodeGenerated[] = [];

    for (let i = 0; i < plan.episodePlans.length; i += 1) {
      const ep = plan.episodePlans[i];
      const script = await generateEpisodeScript(plan, ep, i + 1, safeInputs);
      const narration = await executeNarrationGeneration({
        toolKey: 'story_studio_narration',
        text: script.scriptText,
      });
      if (!narration.result.ok) {
        throw new Error(`Narration failed for episode ${i + 1}: ${narration.result.message}`);
      }
      const audioBucket = getPrivateAudioBucket();
      if (!audioBucket) throw new Error('Private audio bucket is not configured.');
      const audioStorageKey = `audio/${storySlug}/episode-${i + 1}.mp3`;
      await uploadPrivateAudioObject({
        bucket: audioBucket,
        key: audioStorageKey,
        body: narration.result.audioBuffer,
        contentType: narration.result.mimeType,
      });
      generatedEpisodes.push({
        episodeNumber: i + 1,
        title: ep.title,
        synopsis: ep.synopsis,
        scriptText: script.scriptText,
        durationLabel: script.durationLabel,
        durationSeconds: script.durationSeconds,
        audioStorageKey,
        transcriptLines: scriptToTranscriptLines(script.scriptText),
      });
    }

    const coverUrl = await generateCoverForStory(plan, safeInputs, storySlug);
    const story = await prisma.story.create({
      data: {
        slug: storySlug,
        seriesTitle: plan.title,
        summary: plan.summary,
        fullDescription: plan.summary,
        coverUrl,
        isSeries: order.episodeCount > 1,
        isPublished: true,
        isPremium: false,
        isFeatured: false,
        ageRange: String((safeInputs as { studioSetup?: { studioAgeBand?: string } }).studioSetup?.studioAgeBand ?? '6-8'),
        durationLabel: '4-5 min each',
        durationMinutes: 5,
        episodes: {
          create: generatedEpisodes.map((ep) => ({
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            label: `Episode ${ep.episodeNumber}`,
            description: ep.synopsis,
            duration: ep.durationLabel,
            durationSeconds: ep.durationSeconds,
            audioStorageKey: ep.audioStorageKey,
            isPublished: true,
            isPremium: false,
            isFreePreview: true,
            transcriptLines: ep.transcriptLines as unknown as Prisma.InputJsonValue,
          })),
        },
      },
    });

    await prisma.customStoryOrder.update({
      where: { id: order.id },
      data: {
        storyId: story.id,
        status: CUSTOM_STORY_STATUS.COMPLETED,
        generationError: null,
      },
    });
    return { storyId: story.id };
  } catch (error) {
    await prisma.customStoryOrder.update({
      where: { id: order.id },
      data: {
        status: CUSTOM_STORY_STATUS.FAILED,
        generationError: error instanceof Error ? error.message.slice(0, 500) : 'Generation failed',
      },
    });
    throw error;
  }
}

async function generateStoryPlan(inputs: any, episodeCount: number): Promise<StoryPlan> {
  const idea = String(inputs.simpleIdea ?? 'A kind child learns and grows.');
  const lesson = String(inputs.studioSetup?.lesson ?? 'kindness');
  const ageBand = String(inputs.studioSetup?.studioAgeBand ?? '5-7');
  const mainCharacter = String(inputs.studioSetup?.characterType ?? 'child');
  const setting = String(inputs.studioSetup?.setting ?? 'forest');
  const prompt = [
    'Return strict JSON only.',
    `Create a continuous children audio story arc for ${episodeCount} episodes.`,
    'Each episode must be 4-5 minutes spoken narration.',
    `Simple idea: ${idea}.`,
    `Age band: ${ageBand}.`,
    `Main character: ${mainCharacter}. Setting: ${setting}.`,
    `Core lesson: ${lesson}.`,
    'JSON shape: {"title":"...","summary":"...","episodePlans":[{"title":"...","synopsis":"..."}]}',
  ].join('\n');
  const out = await executeTextGeneration({
    toolKey: 'story_studio_generate_brief',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    maxTokens: 2400,
  });
  const parsed = safeParseJson<StoryPlan>(out.content);
  if (!parsed?.title || !Array.isArray(parsed.episodePlans) || parsed.episodePlans.length < episodeCount) {
    throw new Error('Plan generation returned invalid JSON payload.');
  }
  return {
    title: parsed.title,
    summary: parsed.summary || `${parsed.title} is a custom bedtime adventure.`,
    episodePlans: parsed.episodePlans.slice(0, episodeCount),
  };
}

async function generateEpisodeScript(
  plan: StoryPlan,
  episodePlan: StoryPlan['episodePlans'][number],
  episodeNumber: number,
  inputs: any
) {
  const prompt = [
    'Return strict JSON only.',
    `Series title: ${plan.title}`,
    `Episode ${episodeNumber}: ${episodePlan.title}`,
    `Episode synopsis: ${episodePlan.synopsis}`,
    `Narration style: ${inputs.studioSetup?.narrationStyle ?? 'warm'}.`,
    'Write one complete narration script target 4-5 minutes.',
    'Use warm, child-friendly language and keep continuity with previous episodes.',
    'JSON shape: {"scriptText":"...","durationSeconds":number,"durationLabel":"4-5 min"}',
  ].join('\n');
  const out = await executeTextGeneration({
    toolKey: 'story_studio_generate_episode',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    maxTokens: 4200,
  });
  const parsed = safeParseJson<{ scriptText: string; durationSeconds?: number; durationLabel?: string }>(out.content);
  if (!parsed?.scriptText) throw new Error(`Episode ${episodeNumber} script generation failed.`);
  const durationSeconds = Math.min(300, Math.max(240, Number(parsed.durationSeconds ?? 270)));
  return {
    scriptText: parsed.scriptText,
    durationSeconds,
    durationLabel: parsed.durationLabel?.trim() || '4-5 min',
  };
}

async function generateCoverForStory(plan: StoryPlan, inputs: any, storySlug: string): Promise<string | null> {
  const prompt = [
    `${inputs.studioSetup?.artStyle ?? 'storybook'} illustrated cover art for a children's story.`,
    `Title: ${plan.title}.`,
    `Simple idea: ${inputs.simpleIdea ?? ''}.`,
    'No text rendered on image.',
  ].join(' ');
  const image = await executeImageGeneration({
    toolKey: 'story_studio_generate_cover',
    prompt,
  });
  if (!image.result.ok) {
    console.warn('[custom-stories] cover generation failed', image.result.message);
    return null;
  }
  const bucket = getDefaultStorageBucket();
  if (!bucket) {
    console.warn('[custom-stories] public bucket missing; skipping cover upload');
    return null;
  }
  const key = `covers/${storySlug}/cover-${Date.now()}.png`;
  const uploaded = await uploadPublicObject({
    bucket,
    key,
    body: image.result.imageBuffer,
    contentType: image.result.mimeType,
  });
  return uploaded.url;
}
