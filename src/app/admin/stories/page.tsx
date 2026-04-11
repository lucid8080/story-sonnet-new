import { fetchStories } from '@/lib/stories';
import { sortAppStoriesByNewestAdmin } from '@/utils/libraryGridSort';
import StorySeriesAdminClient from '@/components/admin/stories/StorySeriesAdminClient';

export default async function AdminStoriesPage() {
  const stories = sortAppStoriesByNewestAdmin(
    await fetchStories({ visibility: 'all' })
  );
  return <StorySeriesAdminClient initialStories={stories} />;
}
