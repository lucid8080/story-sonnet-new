import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { userHasPremiumPlayback } from '@/lib/billing/premiumAccess';
import { attachThemeAudioToPlayerStory } from '@/lib/attachThemeAudioToPlayerStory';
import { probeThemeAudioAvailability } from '@/lib/themeAudioUrls';
import { fetchStories, fetchStoryBySlug, storyToPlayerPayload } from '@/lib/stories';
import {
  resolveStorySpotlightBadge,
  resolveStorySpotlightInfoBar,
} from '@/lib/content-spotlight/resolve';
import { StoryPageClient } from '@/components/story/StoryPageClient';

type RecommendedStory = {
  slug: string;
  title: string;
  cover: string | null;
  accent: string | null;
};

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const isSignedIn = Boolean(session?.user);
  const userId = session?.user?.id;
  const story = await fetchStoryBySlug(slug, {
    viewerUserId: userId ?? null,
    viewerRole: session?.user?.role ?? null,
  });
  if (!story) notFound();
  const sub = session?.user?.subscriptionStatus;
  const isSubscribed =
    userId != null
      ? await userHasPremiumPlayback(prisma, { userId, subscriptionStatus: sub })
      : false;

  const playerStory = storyToPlayerPayload(story, isSubscribed);
  const themeProbe = await probeThemeAudioAvailability(slug);
  const playerWithTheme = attachThemeAudioToPlayerStory(
    playerStory,
    themeProbe
  );
  const storyId = BigInt(story.id);
  const [spotlightBadge, spotlightInfoBar] = await Promise.all([
    resolveStorySpotlightBadge(storyId),
    resolveStorySpotlightInfoBar(storyId),
  ]);

  const allStories = await fetchStories();
  const recommendedStories: RecommendedStory[] = allStories
    .filter((candidate) => candidate.slug !== story.slug)
    .sort((a, b) => {
      const aGenreMatch = a.genre && story.genre && a.genre === story.genre ? 1 : 0;
      const bGenreMatch = b.genre && story.genre && b.genre === story.genre ? 1 : 0;
      if (aGenreMatch !== bGenreMatch) return bGenreMatch - aGenreMatch;

      const aMoodMatch = a.mood && story.mood && a.mood === story.mood ? 1 : 0;
      const bMoodMatch = b.mood && story.mood && b.mood === story.mood ? 1 : 0;
      if (aMoodMatch !== bMoodMatch) return bMoodMatch - aMoodMatch;

      const aFeatured = a.isFeatured ? 1 : 0;
      const bFeatured = b.isFeatured ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;

      if (a.popularityScore !== b.popularityScore) {
        return b.popularityScore - a.popularityScore;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, 6)
    .map((candidate) => ({
      slug: candidate.slug,
      title: candidate.title,
      cover: candidate.cover,
      accent: candidate.accent,
    }));

  return (
    <StoryPageClient
      story={playerWithTheme}
      isSignedIn={isSignedIn}
      isSubscribed={isSubscribed}
      recommendedStories={recommendedStories}
      spotlightBadge={spotlightBadge}
      spotlightInfoBar={spotlightInfoBar}
    />
  );
}
