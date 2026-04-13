import type { AppStory } from '@/lib/stories';
import type { StorySpotlightBadgeDTO } from '@/lib/content-spotlight/types';

export type HomeRotatingStoryCard = {
  slug: string;
  title: string;
  cover: string | null;
  accent: string | null;
  episodeCount: number;
  isFeatured?: boolean;
  spotlightBadge?: StorySpotlightBadgeDTO | null;
};

export function homeRotatingStoryFromApp(story: AppStory): HomeRotatingStoryCard {
  const title = story.cardTitleOverride?.trim()
    ? story.cardTitleOverride
    : story.title;
  return {
    slug: story.slug,
    title,
    cover: story.cover,
    accent: story.accent,
    episodeCount: story.episodes.length,
    isFeatured: story.isFeatured,
  };
}
