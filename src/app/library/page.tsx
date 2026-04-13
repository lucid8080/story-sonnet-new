import { Suspense } from 'react';
import { auth } from '@/auth';
import { fetchStories } from '@/lib/stories';
import { mapAppStoriesToBrowseStories } from '@/lib/browseStory';
import { fetchSavedStorySlugs } from '@/lib/userSavedStories';
import { parseLibrarySearchParams } from '@/lib/librarySearchParams';
import type { StorySpotlightBadgeDTO } from '@/lib/content-spotlight/types';
import {
  resolveLibrarySpotlightRails,
  resolveSpotlightBadgesBySlug,
} from '@/lib/content-spotlight/resolve';
import LibraryBrowseClient from '@/components/library/LibraryBrowseClient';
import StoryGridSkeleton from '@/components/library/StoryGridSkeleton';

type LibrarySearch = Record<string, string | string[] | undefined>;

function libraryViewKey(
  sort: string,
  searchParams: LibrarySearch
): string {
  return [
    sort,
    String(searchParams.sort ?? ''),
    String(searchParams.age ?? ''),
    String(searchParams.genre ?? ''),
    String(searchParams.mood ?? ''),
  ].join('|');
}

async function LibraryStories({
  searchParams,
}: {
  searchParams: LibrarySearch;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const savedSlugs =
    userId != null ? await fetchSavedStorySlugs(userId) : [];
  const appStories = await fetchStories();
  const browseStories = mapAppStoriesToBrowseStories(appStories);
  const slugs = browseStories.map((s) => s.slug);
  const [spotlightRails, spotlightBadgeBySlug] = await Promise.all([
    resolveLibrarySpotlightRails(),
    resolveSpotlightBadgesBySlug(slugs),
  ]);
  const badgeRecord = Object.fromEntries(
    spotlightBadgeBySlug
  ) as Record<string, StorySpotlightBadgeDTO>;
  const { sort: initialSort, filters: initialFilters } =
    parseLibrarySearchParams(searchParams);

  return (
    <LibraryBrowseClient
      key={libraryViewKey(initialSort, searchParams)}
      initialStories={browseStories}
      savedSlugs={savedSlugs}
      isLoggedIn={!!userId}
      initialSort={initialSort}
      initialFilters={initialFilters}
      spotlightRails={spotlightRails}
      spotlightBadgeBySlug={badgeRecord}
    />
  );
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<LibrarySearch>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<StoryGridSkeleton />}>
      <LibraryStories searchParams={sp} />
    </Suspense>
  );
}
