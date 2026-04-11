import type { StoryStudioDraftEpisode, StoryStudioGeneratedAsset } from '@prisma/client';
import { getDurationBucket } from '@/utils/durationBucket';
import type { AdminStoryUpsertInput } from '@/lib/validation/storySchema';
import type { BriefPayloadParsed, ScriptPackagePayloadParsed } from '@/lib/story-studio/schemas/llm-output';
import {
  resolveDraftGenerationRequest,
  targetLengthRangeToApproxMinutes,
} from '@/lib/story-studio/normalize-request';

type DraftForMapping = {
  id: string;
  title: string;
  slug: string;
  brief: unknown;
  scriptPackage: unknown;
  request: unknown;
  preset: { defaults: unknown } | null;
  episodes: StoryStudioDraftEpisode[];
  assets: StoryStudioGeneratedAsset[];
};

function latestAssetByKind(
  assets: StoryStudioGeneratedAsset[],
  kind: string
): StoryStudioGeneratedAsset | undefined {
  return assets.filter((a) => a.kind === kind).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];
}

function latestEpisodeAudio(
  assets: StoryStudioGeneratedAsset[],
  draftEpisodeId: string
): string | null {
  const match = assets
    .filter(
      (a) =>
        a.kind === 'episode_audio' &&
        a.draftEpisodeId === draftEpisodeId &&
        a.storageKey
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return match?.storageKey ?? null;
}

export function draftToAdminUpsertInput(draft: DraftForMapping): AdminStoryUpsertInput {
  const req = resolveDraftGenerationRequest(draft);
  const brief = draft.brief as BriefPayloadParsed | null;
  const script = draft.scriptPackage as ScriptPackagePayloadParsed | null;

  const title = script?.title ?? brief?.title ?? draft.title;
  const seriesTitle = script?.seriesTitle ?? brief?.seriesTitle ?? title;
  const summary =
    script?.summary ??
    brief?.summary ??
    'Short description for library cards.';

  const fullDescription =
    script?.episodes?.length && script.episodes.length === 1
      ? script.episodes[0].scriptText
      : script?.fullScript ??
        (script?.episodes?.length
          ? script.episodes.map((e) => e.scriptText).join('\n\n---\n\n')
          : null);

  const ageRange = script?.ageRange ?? brief?.ageRange ?? req.catalogAgeRange;
  const genre = brief?.suggestedGenre ?? req.catalogGenre;
  const mood = brief?.suggestedMood ?? req.catalogMood;

  const fallbackMinutes = targetLengthRangeToApproxMinutes(
    req.targetLengthRange
  );
  const estMinutes =
    script?.estimatedRuntimeMinutes ??
    brief?.estimatedRuntimeMinutes ??
    fallbackMinutes;

  const coverAsset = latestAssetByKind(draft.assets, 'cover');
  const coverUrl = coverAsset?.publicUrl ?? null;

  const episodesSorted = [...draft.episodes].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const isSeries =
    req.format === 'mini-series' ||
    req.format === 'series-episode' ||
    episodesSorted.length > 1;

  const episodes: AdminStoryUpsertInput['episodes'] = episodesSorted.map(
    (ep, index) => {
      const audioKey = latestEpisodeAudio(draft.assets, ep.id);
      return {
        id: ep.id,
        episodeNumber: index + 1,
        title: ep.title,
        slug: null,
        summary: ep.summary?.trim() ? ep.summary : null,
        durationMinutes: null,
        durationSeconds: ep.estimatedDurationSeconds ?? null,
        audioUrl: null,
        audioStorageKey: audioKey,
        isPublished: req.autoPublish,
        isPremium: false,
        isFreePreview: index === 0,
        label: episodesSorted.length > 1 ? `Part ${index + 1}` : null,
      };
    }
  );

  return {
    slug: draft.slug.trim().toLowerCase(),
    title,
    seriesTitle,
    subtitle: null,
    summary,
    fullDescription: fullDescription?.trim() ? fullDescription : null,
    coverUrl,
    accent: null,
    ageRange,
    genre: genre ?? null,
    mood: mood ?? null,
    durationMinutes: Number.isFinite(estMinutes) ? estMinutes : fallbackMinutes,
    durationBucket: getDurationBucket(
      Number.isFinite(estMinutes) ? estMinutes : fallbackMinutes
    ),
    durationLabel: null,
    isSeries,
    seriesTagline: brief?.logline ?? null,
    universe: null,
    readingLevel: null,
    topics: script?.tags ?? [],
    characterTags: [],
    cardTitleOverride: null,
    cardDescriptionOverride: null,
    badgeLabelOverride: null,
    popularityScore: 10,
    sortPriority: 0,
    publishedAt: null,
    isFeatured: false,
    isPremium: false,
    isPublished: req.autoPublish,
    metaTitle: null,
    metaDescription: null,
    ageGroup: null,
    episodes,
  };
}
