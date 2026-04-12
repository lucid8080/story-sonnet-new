import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { attachThemeAudioToPlayerStory } from '@/lib/attachThemeAudioToPlayerStory';
import { probeThemeAudioAvailability } from '@/lib/themeAudioUrls';
import { fetchStories, fetchStoryBySlug, storyToPlayerPayload } from '@/lib/stories';
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
  const story = await fetchStoryBySlug(slug);
  if (!story) notFound();

  const session = await auth();
  const isSignedIn = Boolean(session?.user);
  const sub = session?.user?.subscriptionStatus;
  const isSubscribed = sub === 'active' || sub === 'trialing';

  const playerStory = storyToPlayerPayload(story, isSubscribed);
  const themeProbe = await probeThemeAudioAvailability(slug);
  const playerWithTheme = attachThemeAudioToPlayerStory(
    playerStory,
    themeProbe
  );
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
    />
  );
}
