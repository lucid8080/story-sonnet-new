import { canPlayEpisode } from '@/lib/audioEntitlement';
import { getResolvedCatalogEpisodeAudioSrc } from '@/lib/catalogAudio';
import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import type { AdminStoryUpsertInput } from '@/lib/validation/storySchema';
import type { Episode, Prisma, Story } from '@prisma/client';
import { stories as staticStories } from '../data.js';
import { getBrowseSeedForSlug } from '@/data/storyBrowseSeed';
import type { AgeRangeId, DurationBucketId, GenreId, MoodId } from '@/constants/storyFilters';
import { parseDurationToSeconds } from '@/utils/parseDuration';

export type AppEpisode = {
  id: string;
  episodeNumber: number;
  slug: string | null;
  label: string;
  title: string;
  duration: string | null;
  durationSeconds: number | null;
  audioSrc: string | null;
  /** Private R2 key; never send to client — use `storyToPlayerPayload`. */
  audioStorageKey?: string | null;
  description: string | null;
  isPremium: boolean;
  /** Playable without subscription when true (sample), even for premium series. */
  isFreePreview: boolean;
  isPublished: boolean;
};

export type AppStory = {
  id: string;
  slug: string;
  seriesTitle: string;
  title: string;
  subtitle: string | null;
  ageGroup: string | null;
  ageRange: AgeRangeId | null;
  durationLabel: string | null;
  durationMinutes: number | null;
  durationBucket: DurationBucketId | null;
  averageDurationLabel: string | null;
  summary: string | null;
  fullDescription: string | null;
  cover: string | null;
  accent: string | null;
  genre: GenreId | null;
  mood: MoodId | null;
  isSeries: boolean;
  seriesTagline: string | null;
  universe: string | null;
  readingLevel: string | null;
  topics: string[];
  characterTags: string[];
  cardTitleOverride: string | null;
  cardDescriptionOverride: string | null;
  badgeLabelOverride: string | null;
  popularityScore: number;
  sortPriority: number;
  publishedAt: string | null;
  isFeatured: boolean;
  isPremium: boolean;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  episodes: AppEpisode[];
  /** Present when the row is not backed by a database record (slug id, static catalog). */
  isStaticOnly?: boolean;
};

/** Safe for client components: no raw R2 keys or permanent private URLs for DB episodes. */
export type EpisodeForPlayer = {
  id: string;
  episodeNumber: number;
  slug: string | null;
  label: string;
  title: string;
  duration: string | null;
  durationSeconds: number | null;
  /** Direct URL only for static catalog episodes; DB episodes use signed URLs. */
  audioSrc: string | null;
  description: string | null;
  isPremium: boolean;
  isFreePreview: boolean;
  isPublished: boolean;
  useSignedPlayback: boolean;
  playbackEpisodeId: string | null;
};

export type StoryForPlayer = Omit<AppStory, 'episodes'> & {
  episodes: EpisodeForPlayer[];
  /** Public theme URLs; set on the story page after server probe. */
  themeIntroSrc: string | null;
  themeFullSrc: string | null;
  hasIntroTheme: boolean;
  hasFullTheme: boolean;
  /** Theme object is in private R2; client resolves URL via `/api/theme-audio/play`. */
  themeIntroUseSignedPlayback: boolean;
  themeFullUseSignedPlayback: boolean;
};

export function storyToPlayerPayload(
  story: AppStory,
  isSubscribed: boolean
): StoryForPlayer {
  const episodes = story.episodes.map((ep) =>
    episodeToPlayerEpisode(ep, story, isSubscribed)
  );
  return {
    ...story,
    episodes,
    themeIntroSrc: null,
    themeFullSrc: null,
    hasIntroTheme: false,
    hasFullTheme: false,
    themeIntroUseSignedPlayback: false,
    themeFullUseSignedPlayback: false,
  };
}

function episodeToPlayerEpisode(
  ep: AppEpisode,
  story: AppStory,
  isSubscribed: boolean
): EpisodeForPlayer {
  const entitled = canPlayEpisode(
    story.isPremium,
    ep.isPremium,
    ep.isFreePreview,
    isSubscribed
  );
  const hasAudio = !!(
    (ep.audioStorageKey && ep.audioStorageKey.trim()) ||
    (ep.audioSrc && ep.audioSrc.trim())
  );
  const isDbEpisode = isNumericDbStoryId(ep.id) && !story.isStaticOnly;

  if (!entitled || !hasAudio) {
    return {
      id: ep.id,
      episodeNumber: ep.episodeNumber,
      slug: ep.slug,
      label: ep.label,
      title: ep.title,
      duration: ep.duration,
      durationSeconds: ep.durationSeconds,
      audioSrc: null,
      description: ep.description,
      isPremium: ep.isPremium,
      isFreePreview: ep.isFreePreview,
      isPublished: ep.isPublished,
      useSignedPlayback: false,
      playbackEpisodeId: null,
    };
  }

  if (isDbEpisode) {
    return {
      id: ep.id,
      episodeNumber: ep.episodeNumber,
      slug: ep.slug,
      label: ep.label,
      title: ep.title,
      duration: ep.duration,
      durationSeconds: ep.durationSeconds,
      audioSrc: null,
      description: ep.description,
      isPremium: ep.isPremium,
      isFreePreview: ep.isFreePreview,
      isPublished: ep.isPublished,
      useSignedPlayback: true,
      playbackEpisodeId: ep.id,
    };
  }

  return {
    id: ep.id,
    episodeNumber: ep.episodeNumber,
    slug: ep.slug,
    label: ep.label,
    title: ep.title,
    duration: ep.duration,
    durationSeconds: ep.durationSeconds,
    audioSrc: ep.audioSrc,
    description: ep.description,
    isPremium: ep.isPremium,
    isFreePreview: ep.isFreePreview,
    isPublished: ep.isPublished,
    useSignedPlayback: false,
    playbackEpisodeId: null,
  };
}

function parseStringArrayJson(value: Prisma.JsonValue | null | undefined): string[] {
  if (value == null || !Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string');
}

function formatDurationLabelFromSeconds(sec: number | null): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m <= 0) return `${s}s`;
  if (s === 0) return `${m} min`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function computeAverageDuration(episodes: AppEpisode[]): string | null {
  if (!episodes.length) return null;
  const seconds = episodes
    .map((ep) =>
      ep.durationSeconds != null
        ? ep.durationSeconds
        : parseDurationToSeconds(ep.duration)
    )
    .filter((v): v is number => v != null);
  if (seconds.length === 0) return null;
  const avgSeconds = seconds.reduce((a, b) => a + b, 0) / seconds.length;
  const avgMinutes = Math.round(avgSeconds / 60);
  if (!Number.isFinite(avgMinutes) || avgMinutes <= 0) return null;
  return avgMinutes === 1 ? '~1 min' : `~${avgMinutes} min`;
}

function mapDbStoryToApp(story: Story, episodes: Episode[]): AppStory {
  const appEpisodes: AppEpisode[] = (episodes || []).map((ep) => ({
    id: ep.id.toString(),
    episodeNumber: ep.episodeNumber,
    slug: ep.slug ?? null,
    label: ep.label || `Episode ${ep.episodeNumber}`,
    title: ep.title,
    duration: ep.duration,
    durationSeconds: ep.durationSeconds ?? null,
    audioSrc: resolvePublicAssetUrl(ep.audioUrl),
    audioStorageKey: ep.audioStorageKey ?? null,
    description: ep.description,
    isPremium: ep.isPremium,
    isFreePreview: ep.isFreePreview,
    isPublished: ep.isPublished,
  }));

  const ageRange = story.ageRange as AgeRangeId | null;
  const genre = story.genre as GenreId | null;
  const mood = story.mood as MoodId | null;
  const durationBucket = story.durationBucket as DurationBucketId | null;

  return {
    id: story.id.toString(),
    slug: story.slug,
    seriesTitle: story.seriesTitle,
    title: story.title,
    subtitle: story.subtitle ?? null,
    ageGroup: story.ageGroup,
    ageRange: ageRange && ageRange.length ? ageRange : null,
    durationLabel: story.durationLabel,
    durationMinutes: story.durationMinutes ?? null,
    durationBucket: durationBucket && durationBucket.length ? durationBucket : null,
    averageDurationLabel: computeAverageDuration(appEpisodes),
    summary: story.summary,
    fullDescription: story.fullDescription ?? null,
    cover: resolvePublicAssetUrl(story.coverUrl),
    accent: story.accent,
    genre: genre && genre.length ? genre : null,
    mood: mood && mood.length ? mood : null,
    isSeries: story.isSeries,
    seriesTagline: story.seriesTagline ?? null,
    universe: story.universe ?? null,
    readingLevel: story.readingLevel ?? null,
    topics: parseStringArrayJson(story.topics),
    characterTags: parseStringArrayJson(story.characterTags),
    cardTitleOverride: story.cardTitleOverride ?? null,
    cardDescriptionOverride: story.cardDescriptionOverride ?? null,
    badgeLabelOverride: story.badgeLabelOverride ?? null,
    popularityScore: story.popularityScore,
    sortPriority: story.sortPriority,
    publishedAt: story.publishedAt ? story.publishedAt.toISOString() : null,
    isFeatured: story.isFeatured,
    isPremium: story.isPremium,
    isPublished: story.isPublished,
    metaTitle: story.metaTitle ?? null,
    metaDescription: story.metaDescription ?? null,
    episodes: appEpisodes,
    isStaticOnly: false,
  };
}

/**
 * When a story is in the static catalog, use `data.js` public MP3 paths for episodes
 * that do not use `audioStorageKey`, so admin DB rows cannot point at wrong/missing URLs.
 */
function mergeCatalogPublicAudioIntoDbApp(app: AppStory): AppStory {
  if (app.isStaticOnly) return app;
  const episodes = app.episodes.map((ep) => {
    if (ep.audioStorageKey?.trim()) return ep;
    const catalog = getResolvedCatalogEpisodeAudioSrc(app.slug, ep.episodeNumber);
    if (!catalog?.trim()) return ep;
    return { ...ep, audioSrc: catalog };
  });
  return {
    ...app,
    episodes,
    averageDurationLabel: computeAverageDuration(episodes),
  };
}

function overlayCatalogCoverIfSuperseded(app: AppStory): AppStory {
  return app;
}

function resolveStaticIsSeries(
  episodeCount: number,
  seedIsSeries?: boolean
): boolean {
  if (typeof seedIsSeries === 'boolean') return seedIsSeries;
  return episodeCount > 1;
}

function mapStaticToApp(): AppStory[] {
  return staticStories.map((s) => {
    const seed = getBrowseSeedForSlug(s.slug);
    const eps = (s.episodes || []).map((ep, idx) => {
      const num = typeof ep.id === 'number' ? ep.id : idx + 1;
      const sec = parseDurationToSeconds(ep.duration ?? null);
      return {
        id: String(ep.id ?? idx + 1),
        episodeNumber: num,
        slug: null,
        label: ep.label ?? `Episode ${num}`,
        title: ep.title,
        duration: ep.duration ?? null,
        durationSeconds: sec,
        audioSrc: ep.audioSrc ?? null,
        audioStorageKey: null,
        description: ep.description ?? null,
        isPremium: !!(ep as { isPremium?: boolean }).isPremium,
        isFreePreview: false,
        isPublished: true,
      };
    });
    const isSeries = resolveStaticIsSeries(eps.length, seed.isSeries);
    return {
      id: String(s.slug),
      slug: s.slug,
      seriesTitle: s.seriesTitle,
      title: s.title,
      subtitle: null,
      ageGroup: s.ageGroup ?? null,
      ageRange: seed.ageRange,
      durationLabel: s.durationLabel ?? null,
      durationMinutes: null,
      durationBucket: null,
      averageDurationLabel: computeAverageDuration(eps),
      summary: s.summary ?? null,
      fullDescription: null,
      cover: s.cover ?? null,
      accent: s.accent ?? null,
      genre: seed.genre,
      mood: seed.mood,
      isSeries,
      seriesTagline: null,
      universe: null,
      readingLevel: null,
      topics: [],
      characterTags: [],
      cardTitleOverride: null,
      cardDescriptionOverride: null,
      badgeLabelOverride: null,
      popularityScore: seed.popularityScore,
      sortPriority: 0,
      publishedAt: seed.publishedAt,
      isFeatured: !!seed.isFeatured,
      isPremium: !!s.isPremium,
      isPublished: true,
      metaTitle: null,
      metaDescription: null,
      episodes: eps,
      isStaticOnly: true,
    };
  });
}

/** `public` = only published stories and published episodes (for site + APIs). `all` = admin. */
export type StoryVisibility = 'public' | 'all';

export type FetchStoriesOptions = {
  visibility?: StoryVisibility;
};

export type FetchStoryBySlugOptions = {
  visibility?: StoryVisibility;
};

function storyVisibleToPublic(story: AppStory): AppStory {
  return {
    ...story,
    episodes: story.episodes.filter((ep) => ep.isPublished),
  };
}

function applyStoryVisibility(
  stories: AppStory[],
  visibility: StoryVisibility
): AppStory[] {
  if (visibility === 'all') return stories;
  return stories
    .filter((s) => s.isPublished)
    .map(storyVisibleToPublic);
}

function finalizeStoryForVisibility(
  story: AppStory | null,
  visibility: StoryVisibility
): AppStory | null {
  if (!story) return null;
  if (visibility === 'all') return story;
  if (!story.isPublished) return null;
  return storyVisibleToPublic(story);
}

export async function fetchStories(
  options?: FetchStoriesOptions
): Promise<AppStory[]> {
  const visibility = options?.visibility ?? 'public';

  if (!process.env.DATABASE_URL) {
    return applyStoryVisibility(mapStaticToApp(), visibility);
  }

  try {
    const dbStories = await prisma.story.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!dbStories.length) {
      return applyStoryVisibility(mapStaticToApp(), visibility);
    }

    const storyIds = dbStories.map((s) => s.id);
    const dbEpisodes = await prisma.episode.findMany({
      where: { storyId: { in: storyIds } },
      orderBy: { episodeNumber: 'asc' },
    });

    const episodesByStoryId = dbEpisodes.reduce<Record<string, Episode[]>>(
      (acc, ep) => {
        const key = ep.storyId.toString();
        acc[key] = acc[key] || [];
        acc[key].push(ep);
        return acc;
      },
      {}
    );

    const dbBySlug = new Map(dbStories.map((s) => [s.slug, s]));
    const staticAppBySlug = new Map(mapStaticToApp().map((s) => [s.slug, s]));

    const merged: AppStory[] = [];
    for (const s of staticStories) {
      const dbRow = dbBySlug.get(s.slug);
      if (dbRow) {
        const app = mergeCatalogPublicAudioIntoDbApp(
          mapDbStoryToApp(
            dbRow,
            episodesByStoryId[dbRow.id.toString()] || []
          )
        );
        merged.push(overlayCatalogCoverIfSuperseded(app));
      } else {
        const staticApp = staticAppBySlug.get(s.slug);
        if (staticApp) merged.push(staticApp);
      }
    }

    const staticSlugs = new Set(staticStories.map((x) => x.slug));
    for (const dbRow of dbStories) {
      if (!staticSlugs.has(dbRow.slug)) {
        const app = mergeCatalogPublicAudioIntoDbApp(
          mapDbStoryToApp(
            dbRow,
            episodesByStoryId[dbRow.id.toString()] || []
          )
        );
        merged.push(overlayCatalogCoverIfSuperseded(app));
      }
    }

    return applyStoryVisibility(merged, visibility);
  } catch (e) {
    console.warn('[stories] DB failed, using static data.', e);
    return applyStoryVisibility(mapStaticToApp(), visibility);
  }
}

export async function fetchStoryBySlug(
  slug: string,
  options?: FetchStoryBySlugOptions
): Promise<AppStory | null> {
  const visibility = options?.visibility ?? 'public';

  if (!process.env.DATABASE_URL) {
    const found = mapStaticToApp().find((s) => s.slug === slug) ?? null;
    return finalizeStoryForVisibility(found, visibility);
  }

  try {
    const story = await prisma.story.findUnique({ where: { slug } });
    if (!story) {
      const fallback =
        mapStaticToApp().find((s) => s.slug === slug) ?? null;
      return finalizeStoryForVisibility(fallback, visibility);
    }

    const episodes = await prisma.episode.findMany({
      where: { storyId: story.id },
      orderBy: { episodeNumber: 'asc' },
    });

    const app = overlayCatalogCoverIfSuperseded(
      mergeCatalogPublicAudioIntoDbApp(mapDbStoryToApp(story, episodes))
    );
    return finalizeStoryForVisibility(app, visibility);
  } catch (e) {
    console.warn('[stories] fetchStoryBySlug DB failed, using static.', e);
    const fallback = mapStaticToApp().find((s) => s.slug === slug) ?? null;
    return finalizeStoryForVisibility(fallback, visibility);
  }
}

export function isNumericDbStoryId(id: string): boolean {
  return /^\d+$/.test(id);
}

export function getCatalogSlugs(): string[] {
  return staticStories.map((s) => s.slug);
}

type StaticEpisode = {
  id?: number;
  label?: string;
  title: string;
  duration?: string | null;
  audioSrc?: string | null;
  description?: string | null;
  isPremium?: boolean;
};

type StaticStorySource = (typeof staticStories)[number];

function storyCreateDataFromAdmin(
  input: AdminStoryUpsertInput
): Prisma.StoryCreateInput {
  return {
    slug: input.slug,
    seriesTitle: input.seriesTitle,
    title: input.title,
    subtitle: input.subtitle ?? undefined,
    ageGroup: input.ageGroup ?? undefined,
    ageRange: input.ageRange,
    durationLabel: input.durationLabel ?? undefined,
    durationMinutes: input.durationMinutes ?? undefined,
    durationBucket: input.durationBucket ?? undefined,
    summary: input.summary,
    fullDescription: input.fullDescription ?? undefined,
    coverUrl: input.coverUrl ?? undefined,
    accent: input.accent ?? undefined,
    genre: input.genre ?? undefined,
    mood: input.mood ?? undefined,
    isSeries: input.isSeries,
    seriesTagline: input.seriesTagline ?? undefined,
    universe: input.universe ?? undefined,
    readingLevel: input.readingLevel ?? undefined,
    topics: input.topics,
    characterTags: input.characterTags,
    cardTitleOverride: input.cardTitleOverride ?? undefined,
    cardDescriptionOverride: input.cardDescriptionOverride ?? undefined,
    badgeLabelOverride: input.badgeLabelOverride ?? undefined,
    popularityScore: input.popularityScore,
    sortPriority: input.sortPriority,
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
    isFeatured: input.isFeatured,
    isPublished: input.isPublished,
    isPremium: input.isPremium,
    metaTitle: input.metaTitle ?? undefined,
    metaDescription: input.metaDescription ?? undefined,
  };
}

function storyUpdateDataFromAdmin(
  input: AdminStoryUpsertInput
): Prisma.StoryUpdateInput {
  return {
    slug: input.slug,
    seriesTitle: input.seriesTitle,
    title: input.title,
    subtitle: input.subtitle,
    ageGroup: input.ageGroup,
    ageRange: input.ageRange,
    durationLabel: input.durationLabel,
    durationMinutes: input.durationMinutes,
    durationBucket: input.durationBucket,
    summary: input.summary,
    fullDescription: input.fullDescription,
    coverUrl: input.coverUrl,
    accent: input.accent,
    genre: input.genre,
    mood: input.mood,
    isSeries: input.isSeries,
    seriesTagline: input.seriesTagline,
    universe: input.universe,
    readingLevel: input.readingLevel,
    topics: input.topics,
    characterTags: input.characterTags,
    cardTitleOverride: input.cardTitleOverride,
    cardDescriptionOverride: input.cardDescriptionOverride,
    badgeLabelOverride: input.badgeLabelOverride,
    popularityScore: input.popularityScore,
    sortPriority: input.sortPriority,
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    isFeatured: input.isFeatured,
    isPublished: input.isPublished,
    isPremium: input.isPremium,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
  };
}

async function syncEpisodesForStory(
  tx: Prisma.TransactionClient,
  storyId: bigint,
  input: AdminStoryUpsertInput,
  staticFallback: StaticStorySource | null
) {
  let rows = input.episodes;
  if (!rows.length && staticFallback?.episodes?.length) {
    const eps = staticFallback.episodes as StaticEpisode[];
    rows = eps.map((ep, idx) => {
      const num = typeof ep.id === 'number' ? ep.id : idx + 1;
      const sec = parseDurationToSeconds(ep.duration ?? null);
      return {
        id: `seed-${num}`,
        episodeNumber: num,
        title: ep.title,
        slug: null as string | null,
        summary: ep.description ?? null,
        durationMinutes: sec != null ? Math.floor(sec / 60) : null,
        durationSeconds: sec,
        audioUrl: ep.audioSrc ?? null,
        audioStorageKey: null,
        isPublished: true,
        isPremium: !!ep.isPremium,
        isFreePreview: false,
        label: ep.label ?? null,
      };
    });
  }

  const existing = await tx.episode.findMany({
    where: { storyId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((e) => e.id.toString()));

  const keepNumericIds = new Set<string>();
  for (const ep of rows) {
    if (isNumericDbStoryId(ep.id)) {
      keepNumericIds.add(ep.id);
    }
  }

  const toDelete = [...existingIds].filter((id) => !keepNumericIds.has(id));
  if (toDelete.length) {
    await tx.episode.deleteMany({
      where: {
        storyId,
        id: { in: toDelete.map((id) => BigInt(id)) },
      },
    });
  }

  for (let i = 0; i < rows.length; i++) {
    const ep = rows[i];
    const episodeNumber = i + 1;
    const durationSeconds =
      ep.durationSeconds != null && Number.isFinite(ep.durationSeconds)
        ? Math.round(ep.durationSeconds)
        : null;
    const durationLabel = formatDurationLabelFromSeconds(durationSeconds);

    const data = {
      episodeNumber,
      title: ep.title,
      slug: ep.slug && ep.slug.length > 0 ? ep.slug : null,
      label: ep.label ?? null,
      description: ep.summary ?? null,
      duration: durationLabel,
      durationSeconds,
      audioUrl: ep.audioUrl ?? null,
      audioStorageKey: ep.audioStorageKey ?? null,
      isPublished: ep.isPublished,
      isPremium: ep.isPremium,
      isFreePreview: ep.isFreePreview ?? false,
    };

    if (isNumericDbStoryId(ep.id) && existingIds.has(ep.id)) {
      await tx.episode.update({
        where: { id: BigInt(ep.id) },
        data,
      });
    } else {
      await tx.episode.create({
        data: {
          storyId,
          ...data,
        },
      });
    }
  }
}

async function seedStoryFromStaticFull(
  staticStory: StaticStorySource,
  input: AdminStoryUpsertInput
) {
  const merged: AdminStoryUpsertInput = {
    ...input,
    slug: input.slug || staticStory.slug,
    seriesTitle: input.seriesTitle || staticStory.seriesTitle,
    title: input.title || staticStory.title,
    summary: input.summary?.trim()
      ? input.summary
      : staticStory.summary ?? 'Short description for library cards.',
    coverUrl: input.coverUrl ?? staticStory.cover ?? null,
    accent: input.accent ?? staticStory.accent ?? null,
    durationLabel:
      input.durationLabel ?? staticStory.durationLabel ?? null,
  };
  return prisma.$transaction(async (tx) => {
    const created = await tx.story.create({
      data: storyCreateDataFromAdmin(merged),
    });
    await syncEpisodesForStory(tx, created.id, merged, staticStory);
    return created;
  });
}

async function assertSlugAvailableForUpsert(
  inputSlug: string,
  existingKey: string
) {
  let excludeId: bigint | null = null;
  if (isNumericDbStoryId(existingKey)) {
    excludeId = BigInt(existingKey);
  } else {
    const row = await prisma.story.findUnique({
      where: { slug: existingKey },
      select: { id: true },
    });
    excludeId = row?.id ?? null;
  }
  const conflict = await prisma.story.findFirst({
    where: {
      slug: inputSlug,
      ...(excludeId != null ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (conflict) {
    throw new Error(`Slug already in use: ${inputSlug}`);
  }
}

export async function upsertStoryFromAdmin(
  existingKey: string,
  input: AdminStoryUpsertInput
): Promise<Story> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database is not configured.');
  }

  await assertSlugAvailableForUpsert(input.slug, existingKey);

  if (isNumericDbStoryId(existingKey)) {
    const id = BigInt(existingKey);
    const row = await prisma.story.findUnique({ where: { id } });
    if (!row) {
      throw new Error('Story not found.');
    }
    return prisma.$transaction(async (tx) => {
      await tx.story.update({
        where: { id },
        data: storyUpdateDataFromAdmin(input),
      });
      await syncEpisodesForStory(tx, id, input, null);
      const updated = await tx.story.findUniqueOrThrow({ where: { id } });
      return updated;
    });
  }

  const slugKey = existingKey;
  const existing = await prisma.story.findUnique({ where: { slug: slugKey } });
  if (existing) {
    return prisma.$transaction(async (tx) => {
      await tx.story.update({
        where: { id: existing.id },
        data: storyUpdateDataFromAdmin(input),
      });
      await syncEpisodesForStory(tx, existing.id, input, null);
      return tx.story.findUniqueOrThrow({ where: { id: existing.id } });
    });
  }

  const staticStory = staticStories.find((s) => s.slug === slugKey);
  if (staticStory) {
    return seedStoryFromStaticFull(staticStory, input);
  }

  throw new Error(
    `Unknown story key: ${slugKey}. Save from an existing catalog story or create a new draft.`
  );
}

export async function createDraftStory(): Promise<Story> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database is not configured.');
  }
  const base = `draft-${Date.now().toString(36)}`;
  let slug = base;
  let n = 0;
  while (await prisma.story.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return prisma.story.create({
    data: {
      slug,
      seriesTitle: 'Untitled series',
      title: 'Untitled story',
      summary: 'Short description for library cards.',
      ageRange: '6-8',
      isSeries: false,
      isPublished: false,
      isPremium: false,
      isFeatured: false,
      popularityScore: 10,
      sortPriority: 0,
    },
  });
}

export async function deleteStoryAdmin(id: string): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database is not configured.');
  }
  if (!isNumericDbStoryId(id)) {
    throw new Error('Only database-backed stories can be deleted.');
  }
  await prisma.story.delete({
    where: { id: BigInt(id) },
  });
}

export async function duplicateStoryAdmin(id: string): Promise<Story> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database is not configured.');
  }
  if (!isNumericDbStoryId(id)) {
    throw new Error('Only database-backed stories can be duplicated.');
  }
  const src = await prisma.story.findUnique({
    where: { id: BigInt(id) },
    include: { episodes: { orderBy: { episodeNumber: 'asc' } } },
  });
  if (!src) {
    throw new Error('Story not found.');
  }
  const base = `${src.slug}-copy`;
  let slug = base;
  let n = 0;
  while (await prisma.story.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  const eps = src.episodes;
  return prisma.story.create({
    data: {
      slug,
      seriesTitle: src.seriesTitle,
      title: `${src.title} (copy)`,
      subtitle: src.subtitle,
      ageGroup: src.ageGroup,
      ageRange: src.ageRange,
      durationLabel: src.durationLabel,
      durationMinutes: src.durationMinutes,
      durationBucket: src.durationBucket,
      summary: src.summary,
      fullDescription: src.fullDescription,
      coverUrl: src.coverUrl,
      accent: src.accent,
      genre: src.genre,
      mood: src.mood,
      isSeries: src.isSeries,
      seriesTagline: src.seriesTagline,
      universe: src.universe,
      readingLevel: src.readingLevel,
      topics: src.topics ?? undefined,
      characterTags: src.characterTags ?? undefined,
      cardTitleOverride: src.cardTitleOverride,
      cardDescriptionOverride: src.cardDescriptionOverride,
      badgeLabelOverride: src.badgeLabelOverride,
      popularityScore: src.popularityScore,
      sortPriority: src.sortPriority,
      publishedAt: null,
      isFeatured: false,
      isPublished: false,
      isPremium: src.isPremium,
      metaTitle: src.metaTitle,
      metaDescription: src.metaDescription,
      episodes: {
        create: eps.map((ep, idx) => ({
          episodeNumber: idx + 1,
          title: ep.title,
          slug: null,
          label: ep.label,
          description: ep.description,
          duration: ep.duration,
          durationSeconds: ep.durationSeconds,
          audioUrl: ep.audioUrl,
          audioStorageKey: ep.audioStorageKey,
          isPublished: ep.isPublished,
          isPremium: ep.isPremium,
          isFreePreview: ep.isFreePreview,
        })),
      },
    },
  });
}

/** @deprecated Use upsertStoryFromAdmin for admin saves. */
export async function updateStoryMeta(input: {
  id: string;
  title?: string;
  is_published?: boolean;
  is_premium?: boolean;
  duration_label?: string;
}) {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database is not configured.');
  }

  const patchData: Prisma.StoryUpdateInput = {};
  if (typeof input.title === 'string') patchData.title = input.title;
  if (typeof input.is_published === 'boolean') {
    patchData.isPublished = input.is_published;
  }
  if (typeof input.is_premium === 'boolean') {
    patchData.isPremium = input.is_premium;
  }
  if (typeof input.duration_label === 'string') {
    patchData.durationLabel = input.duration_label;
  }

  const hasPatch = Object.keys(patchData).length > 0;

  if (isNumericDbStoryId(input.id)) {
    const id = BigInt(input.id);
    if (!hasPatch) {
      const row = await prisma.story.findUnique({ where: { id } });
      if (!row) {
        throw new Error('Story not found.');
      }
      return row;
    }
    return prisma.story.update({
      where: { id },
      data: patchData,
    });
  }

  const slug = input.id;
  const staticStory = staticStories.find((s) => s.slug === slug);
  if (!staticStory) {
    throw new Error(`Unknown story slug: ${slug}`);
  }

  const existing = await prisma.story.findUnique({ where: { slug } });
  if (existing) {
    if (!hasPatch) {
      return existing;
    }
    return prisma.story.update({
      where: { id: existing.id },
      data: patchData,
    });
  }

  const minimal: AdminStoryUpsertInput = {
    slug: staticStory.slug,
    title:
      typeof input.title === 'string' ? input.title : staticStory.title,
    seriesTitle: staticStory.seriesTitle,
    summary: staticStory.summary ?? ' ',
    ageRange: getBrowseSeedForSlug(staticStory.slug).ageRange,
    isSeries: resolveStaticIsSeries(
      (staticStory.episodes || []).length,
      getBrowseSeedForSlug(staticStory.slug).isSeries
    ),
    isPublished:
      typeof input.is_published === 'boolean' ? input.is_published : true,
    isPremium:
      typeof input.is_premium === 'boolean'
        ? input.is_premium
        : !!staticStory.isPremium,
    isFeatured: false,
    popularityScore: getBrowseSeedForSlug(staticStory.slug).popularityScore,
    sortPriority: 0,
    topics: [],
    characterTags: [],
    durationLabel:
      typeof input.duration_label === 'string'
        ? input.duration_label
        : staticStory.durationLabel ?? null,
    episodes: [],
  };
  return seedStoryFromStaticFull(staticStory, minimal);
}
