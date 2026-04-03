import { fetchStories } from '@/lib/stories';
import StorySeriesAdminClient from '@/components/admin/stories/StorySeriesAdminClient';

export default async function AdminStoriesPage() {
  const stories = await fetchStories();
  return <StorySeriesAdminClient initialStories={stories} />;
}
