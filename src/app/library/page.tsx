import { Suspense } from 'react';
import { auth } from '@/auth';
import { fetchStories } from '@/lib/stories';
import { mapAppStoriesToBrowseStories } from '@/lib/browseStory';
import { fetchSavedStorySlugs } from '@/lib/userSavedStories';
import LibraryBrowseClient from '@/components/library/LibraryBrowseClient';
import StoryGridSkeleton from '@/components/library/StoryGridSkeleton';

async function LibraryStories() {
  const session = await auth();
  const userId = session?.user?.id;
  const savedSlugs =
    userId != null ? await fetchSavedStorySlugs(userId) : [];
  const appStories = await fetchStories();
  const browseStories = mapAppStoriesToBrowseStories(appStories);
  return (
    <LibraryBrowseClient
      initialStories={browseStories}
      savedSlugs={savedSlugs}
      isLoggedIn={!!userId}
    />
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<StoryGridSkeleton />}>
      <LibraryStories />
    </Suspense>
  );
}
