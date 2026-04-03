import type { AppEpisode, AppStory } from '@/lib/stories';
import { getBrowseSeedForSlug } from '@/data/storyBrowseSeed';
import type { BrowseStory } from '@/types/story';
import type { DurationBucketId, GenreId } from '@/constants/storyFilters';
import { parseDurationToSeconds } from '@/utils/parseDuration';

function totalDurationMinutes(
  episodes: AppEpisode[],
  durationLabel: string | null,
  storyMinutes: number | null
): number {
  if (storyMinutes != null && Number.isFinite(storyMinutes) && storyMinutes >= 0) {
    return Math.max(1, Math.round(storyMinutes));
  }
  let seconds = 0;
  for (const ep of episodes) {
    if (ep.durationSeconds != null && Number.isFinite(ep.durationSeconds)) {
      seconds += ep.durationSeconds;
      continue;
    }
    const s = parseDurationToSeconds(ep.duration);
    if (s != null) seconds += s;
  }
  if (seconds > 0) {
    return Math.max(1, Math.round(seconds / 60));
  }
  const fromLabel = parseDurationToSeconds(durationLabel);
  if (fromLabel != null) {
    return Math.max(1, Math.round(fromLabel / 60));
  }
  return 5;
}

export function mapAppStoryToBrowseStory(story: AppStory): BrowseStory {
  const seed = getBrowseSeedForSlug(story.slug);

  const ageRange = (story.ageRange ?? seed.ageRange) as BrowseStory['ageRange'];
  const genre = (story.genre ?? seed.genre) as GenreId;
  const mood = (story.mood ?? seed.mood) as BrowseStory['mood'];
  const publishedAt = story.publishedAt ?? seed.publishedAt;
  const popularityScore = story.popularityScore ?? seed.popularityScore;
  const isFeatured = story.isFeatured ?? seed.isFeatured ?? false;

  const durationMinutes = totalDurationMinutes(
    story.episodes,
    story.durationLabel,
    story.durationMinutes
  );

  const durationBucketOverride: DurationBucketId | null | undefined =
    story.durationBucket &&
    ['under5', '5-10', '10-15', '15plus'].includes(story.durationBucket)
      ? (story.durationBucket as DurationBucketId)
      : null;

  const title = story.cardTitleOverride?.trim()
    ? story.cardTitleOverride
    : story.title;
  const shortDescription =
    story.cardDescriptionOverride?.trim() ??
    story.summary ??
    '';

  return {
    id: story.id,
    slug: story.slug,
    title,
    coverImage: story.cover ?? '',
    shortDescription,
    ageRange,
    genre,
    durationMinutes,
    durationBucketOverride,
    mood,
    isSeries: story.isSeries,
    seriesName: story.isSeries ? story.seriesTitle : null,
    popularityScore,
    publishedAt,
    sortPriority: story.sortPriority ?? 0,
    isFeatured,
    isPremium: story.isPremium,
  };
}

export function mapAppStoriesToBrowseStories(stories: AppStory[]): BrowseStory[] {
  return stories.map(mapAppStoryToBrowseStory);
}
