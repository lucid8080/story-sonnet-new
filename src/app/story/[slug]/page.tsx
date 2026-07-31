import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { userHasPremiumPlayback } from '@/lib/billing/premiumAccess';
import { storyToPlayerPayload } from '@/lib/stories';
import { getCachedStoryRecommendations } from '@/lib/storyRecommendations';
import {
  getCachedStorySpotlightBadge,
  getCachedStorySpotlightInfoBar,
  loadStoryForStoryPage,
} from '@/lib/storyPageCache';
import { StoryPageClient } from '@/components/story/StoryPageClient';

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const story = await loadStoryForStoryPage(
    slug,
    userId ?? null,
    session?.user?.role
  );
  if (!story) notFound();

  const sub = session?.user?.subscriptionStatus;
  const isSubscribed =
    userId != null
      ? await userHasPremiumPlayback(prisma, {
          userId,
          subscriptionStatus: sub,
        })
      : false;

  const playerStory = storyToPlayerPayload(story, isSubscribed, userId != null);
  const storyId = BigInt(story.id);

  const [spotlightBadge, spotlightInfoBar, recommendedStories] =
    await Promise.all([
      getCachedStorySpotlightBadge(storyId),
      getCachedStorySpotlightInfoBar(storyId),
      getCachedStoryRecommendations({
        slug: story.slug,
        genre: story.genre,
        mood: story.mood,
        isFeatured: story.isFeatured,
        popularityScore: story.popularityScore,
      }),
    ]);

  return (
    <StoryPageClient
      story={playerStory}
      isLoggedIn={userId != null}
      isSubscribed={isSubscribed}
      recommendedStories={recommendedStories}
      spotlightBadge={spotlightBadge}
      spotlightInfoBar={spotlightInfoBar}
    />
  );
}
