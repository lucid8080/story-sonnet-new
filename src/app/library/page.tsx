import { Suspense } from 'react';
import { auth } from '@/auth';
import { mapAppStoriesToBrowseStories } from '@/lib/browseStory';
import { fetchSavedStorySlugs } from '@/lib/userSavedStories';
import { parseLibrarySearchParams } from '@/lib/librarySearchParams';
import {
  getCachedCatalogSpotlightBadges,
  getCachedLibrarySpotlightRails,
  getCachedPublicStories,
  STORY_PAGE_REVALIDATE_SEC,
} from '@/lib/storyPageCache';
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
  const appStories = await getCachedPublicStories();
  const browseStories = mapAppStoriesToBrowseStories(appStories);
  const [spotlightRails, badgeRecord] = await Promise.all([
    getCachedLibrarySpotlightRails(),
    getCachedCatalogSpotlightBadges(),
  ]);
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

export const revalidate = STORY_PAGE_REVALIDATE_SEC;

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
