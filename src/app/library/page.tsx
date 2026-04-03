import { Suspense } from 'react';
import { fetchStories } from '@/lib/stories';
import { mapAppStoriesToBrowseStories } from '@/lib/browseStory';
import LibraryBrowseClient from '@/components/library/LibraryBrowseClient';
import StoryGridSkeleton from '@/components/library/StoryGridSkeleton';

async function LibraryStories() {
  const appStories = await fetchStories();
  const browseStories = mapAppStoriesToBrowseStories(appStories);
  return <LibraryBrowseClient initialStories={browseStories} />;
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<StoryGridSkeleton />}>
      <LibraryStories />
    </Suspense>
  );
}
