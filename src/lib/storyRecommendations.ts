import { unstable_cache } from 'next/cache';
import type { GenreId, MoodId } from '@/constants/storyFilters';
import type { AppStory } from '@/lib/stories';
import { getCachedPublicStories } from '@/lib/storyPageCache';

export type StoryRecommendationCard = {
  slug: string;
  title: string;
  cover: string | null;
  accent: string | null;
};

export type StoryRecommendationInputs = {
  slug: string;
  genre: GenreId | null;
  mood: MoodId | null;
  isFeatured: boolean;
  popularityScore: number;
};

function buildRecommendations(
  allStories: AppStory[],
  inputs: StoryRecommendationInputs
): StoryRecommendationCard[] {
  return allStories
    .filter((candidate) => candidate.slug !== inputs.slug)
    .sort((a, b) => {
      const aGenreMatch =
        a.genre && inputs.genre && a.genre === inputs.genre ? 1 : 0;
      const bGenreMatch =
        b.genre && inputs.genre && b.genre === inputs.genre ? 1 : 0;
      if (aGenreMatch !== bGenreMatch) return bGenreMatch - aGenreMatch;

      const aMoodMatch =
        a.mood && inputs.mood && a.mood === inputs.mood ? 1 : 0;
      const bMoodMatch =
        b.mood && inputs.mood && b.mood === inputs.mood ? 1 : 0;
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
}

/** Cached catalog slice for the story page recommendations row. */
export async function getCachedStoryRecommendations(
  inputs: StoryRecommendationInputs
): Promise<StoryRecommendationCard[]> {
  const genreKey = inputs.genre ?? '';
  const moodKey = inputs.mood ?? '';

  return unstable_cache(
    async () => {
      const allStories = await getCachedPublicStories();
      return buildRecommendations(allStories, inputs);
    },
    [
      'story-recommendations-v1',
      inputs.slug,
      genreKey,
      moodKey,
      inputs.isFeatured ? '1' : '0',
      String(inputs.popularityScore),
    ],
    { revalidate: 600, tags: ['story-catalog', `story-rec:${inputs.slug}`] }
  )();
}
