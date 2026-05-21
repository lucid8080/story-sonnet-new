import { unstable_cache } from 'next/cache';
import { fetchStories, fetchStoryBySlug } from '@/lib/stories';
import type { StorySpotlightBadgeDTO } from '@/lib/content-spotlight/types';
import {
  resolveHomepageSpotlightRails,
  resolveLibrarySpotlightRails,
  resolveSpotlightBadgesBySlug,
  resolveStorySpotlightBadge,
  resolveStorySpotlightInfoBar,
} from '@/lib/content-spotlight/resolve';

/** Shared TTL for published story metadata, catalog, recommendations, spotlights. */
export const STORY_PAGE_REVALIDATE_SEC = 600;

/** Theme object layout changes rarely; probe is cached longer to avoid S3/CDN HEAD storms. */
export const THEME_PROBE_CACHE_REVALIDATE_SEC = 86_400;

export function getCachedPublicStories() {
  return unstable_cache(
    async () => fetchStories(),
    ['public-stories-catalog-v1'],
    { revalidate: STORY_PAGE_REVALIDATE_SEC, tags: ['story-catalog'] }
  )();
}

export function getCachedPublishedStoryBySlug(slug: string) {
  return unstable_cache(
    async () => fetchStoryBySlug(slug),
    ['story-published-v1', slug],
    { revalidate: STORY_PAGE_REVALIDATE_SEC, tags: ['story-catalog', `story:${slug}`] }
  )();
}

/**
 * Published catalog stories use the Data Cache; admins and private UGC fall back to live fetch.
 */
export async function loadStoryForStoryPage(
  slug: string,
  viewerUserId: string | null,
  viewerRole: string | null | undefined
) {
  if (viewerRole === 'admin') {
    return fetchStoryBySlug(slug, {
      viewerUserId,
      viewerRole: viewerRole ?? null,
    });
  }

  const cached = await getCachedPublishedStoryBySlug(slug);
  if (cached) return cached;

  if (viewerUserId) {
    return fetchStoryBySlug(slug, {
      viewerUserId,
      viewerRole: viewerRole ?? null,
    });
  }

  return null;
}

export function getCachedStorySpotlightBadge(storyId: bigint) {
  const id = storyId.toString();
  return unstable_cache(
    async () => resolveStorySpotlightBadge(storyId),
    ['story-spotlight-badge-v1', id],
    { revalidate: STORY_PAGE_REVALIDATE_SEC, tags: ['spotlight', `story-spotlight:${id}`] }
  )();
}

export function getCachedStorySpotlightInfoBar(storyId: bigint) {
  const id = storyId.toString();
  return unstable_cache(
    async () => resolveStorySpotlightInfoBar(storyId),
    ['story-spotlight-info-v1', id],
    { revalidate: STORY_PAGE_REVALIDATE_SEC, tags: ['spotlight', `story-spotlight:${id}`] }
  )();
}

export function getCachedHomepageSpotlightRails() {
  return unstable_cache(
    async () => resolveHomepageSpotlightRails(),
    ['homepage-spotlight-rails-v1'],
    { revalidate: STORY_PAGE_REVALIDATE_SEC, tags: ['spotlight'] }
  )();
}

export function getCachedLibrarySpotlightRails() {
  return unstable_cache(
    async () => resolveLibrarySpotlightRails(),
    ['library-spotlight-rails-v1'],
    { revalidate: STORY_PAGE_REVALIDATE_SEC, tags: ['spotlight'] }
  )();
}

/** Badge map for the full public catalog (home + library grids). */
export function getCachedCatalogSpotlightBadges(): Promise<
  Record<string, StorySpotlightBadgeDTO>
> {
  return unstable_cache(
    async () => {
      const stories = await getCachedPublicStories();
      const slugs = stories.map((s) => s.slug);
      const map = await resolveSpotlightBadgesBySlug(slugs);
      return Object.fromEntries(map);
    },
    ['catalog-spotlight-badges-v1'],
    { revalidate: STORY_PAGE_REVALIDATE_SEC, tags: ['story-catalog', 'spotlight'] }
  )();
}
