import type {
  Episode,
  StoryStudioDraftEpisode,
  StoryStudioGeneratedAsset,
} from '@prisma/client';
import { getDurationBucket } from '@/utils/durationBucket';
import type { AdminStoryUpsertInput } from '@/lib/validation/storySchema';
import type { BriefPayloadParsed, ScriptPackagePayloadParsed } from '@/lib/story-studio/schemas/llm-output';
import {
  resolveDraftGenerationRequest,
  targetLengthRangeToApproxMinutes,
} from '@/lib/story-studio/normalize-request';
import { readLibraryEpisodeIdFromNotes } from '@/lib/story-studio/library-episode-link';
import { scriptToTranscriptLines } from '@/lib/transcripts/from-script';

type DraftForMapping = {
  id: string;
  seriesTitle: string;
  slug: string;
  brief: unknown;
  scriptPackage: unknown;
  request: unknown;
  preset: { defaults: unknown } | null;
  episodes: StoryStudioDraftEpisode[];
  assets: StoryStudioGeneratedAsset[];
  /** Library episodes when `linkedStoryId` is set (track order + manual rows). */
  libraryEpisodes?: Pick<
    Episode,
    | 'id'
    | 'episodeNumber'
    | 'title'
    | 'description'
    | 'audioStorageKey'
    | 'audioUrl'
    | 'durationSeconds'
    | 'isPublished'
    | 'isPremium'
    | 'isFreePreview'
    | 'label'
    | 'slug'
  >[];
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

  const seriesTitle = script?.seriesTitle ?? brief?.seriesTitle ?? draft.seriesTitle;
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

  const selectedCoverAsset =
    req.mainCoverAssetId?.trim()
      ? draft.assets.find(
          (a) =>
            a.id === req.mainCoverAssetId &&
            a.kind === 'cover' &&
            !!a.publicUrl?.trim()
        )
      : undefined;
  const coverAsset = selectedCoverAsset ?? latestAssetByKind(draft.assets, 'cover');
  const coverUrl = coverAsset?.publicUrl ?? null;

  const episodesSorted = [...draft.episodes].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const isSeries =
    req.format === 'mini-series' ||
    req.format === 'series-episode' ||
    episodesSorted.length > 1;

  const libraryById = new Map(
    (draft.libraryEpisodes ?? []).map((le) => [le.id.toString(), le])
  );

  const episodes: AdminStoryUpsertInput['episodes'] = episodesSorted.map(
    (ep, index) => {
      const libraryEpisodeId = readLibraryEpisodeIdFromNotes(ep.notes);
      const lib = libraryEpisodeId
        ? libraryById.get(libraryEpisodeId)
        : undefined;
      const studioAudioKey = latestEpisodeAudio(draft.assets, ep.id);
      const audioKey =
        studioAudioKey ?? lib?.audioStorageKey?.trim() ?? null;
      const scriptEpisode = script?.episodes?.[index];
      const rawScript =
        ep.scriptText.trim() ||
        scriptEpisode?.scriptText?.trim() ||
        '';
      const transcriptLines =
        rawScript.length > 0 ? scriptToTranscriptLines(rawScript) : undefined;
      return {
        id: libraryEpisodeId ?? ep.id,
        episodeNumber: index + 1,
        title: ep.title.trim() ? ep.title : (lib?.title ?? ep.title),
        slug: lib?.slug ?? null,
        summary: ep.summary?.trim()
          ? ep.summary
          : (lib?.description?.trim() ? lib.description : null),
        durationMinutes: null,
        durationSeconds:
          ep.estimatedDurationSeconds ?? lib?.durationSeconds ?? null,
        audioUrl: lib?.audioUrl ?? null,
        audioStorageKey: audioKey,
        transcriptStorageKey: null,
        isPublished: lib?.isPublished ?? req.autoPublish,
        isPremium: lib?.isPremium ?? false,
        isFreePreview: lib?.isFreePreview ?? index === 0,
        label:
          lib?.label ??
          (episodesSorted.length > 1 ? `Part ${index + 1}` : null),
        ...(transcriptLines !== undefined ? { transcriptLines } : {}),
      };
    }
  );

  return {
    slug: draft.slug.trim().toLowerCase(),
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
