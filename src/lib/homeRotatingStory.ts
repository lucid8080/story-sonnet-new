import type { AppStory } from '@/lib/stories';

export type HomeRotatingStoryCard = {
  slug: string;
  title: string;
  cover: string | null;
  accent: string | null;
  episodeCount: number;
  isFeatured?: boolean;
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
