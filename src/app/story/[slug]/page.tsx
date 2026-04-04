import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { attachThemeAudioToPlayerStory } from '@/lib/attachThemeAudioToPlayerStory';
import { probeThemeAudioAvailability } from '@/lib/themeAudioUrls';
import { fetchStoryBySlug, storyToPlayerPayload } from '@/lib/stories';
import { StoryPageClient } from '@/components/story/StoryPageClient';

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await fetchStoryBySlug(slug);
  if (!story) notFound();

  const session = await auth();
  const sub = session?.user?.subscriptionStatus;
  const isSubscribed = sub === 'active' || sub === 'trialing';

  const playerStory = storyToPlayerPayload(story, isSubscribed);
  const themeProbe = await probeThemeAudioAvailability(slug);
  const playerWithTheme = attachThemeAudioToPlayerStory(
    playerStory,
    themeProbe
  );

  return (
    <StoryPageClient story={playerWithTheme} isSubscribed={isSubscribed} />
  );
}
