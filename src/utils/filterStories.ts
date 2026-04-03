import type { SortOption } from '@/constants/storyFilters';
import type { BrowseStory, StoryFiltersState } from '@/types/story';
import { getDurationBucket } from '@/utils/durationBucket';

function matchesSeriesFilter(
  story: BrowseStory,
  selected: StoryFiltersState['seriesModes']
): boolean {
  if (selected.length === 0) return true;
  const wantSeries = selected.includes('series');
  const wantStandalone = selected.includes('standalone');
  if (wantSeries && wantStandalone) {
    return true;
  }
  if (wantSeries) return story.isSeries;
  if (wantStandalone) return !story.isSeries;
  return true;
}

/**
 * OR within each group, AND across groups. Sort runs after filtering.
 */
export function filterAndSortStories(
  stories: BrowseStory[],
  filters: StoryFiltersState,
  sort: SortOption
): BrowseStory[] {
  const filtered = stories.filter((story) => {
    if (filters.ageRanges.length > 0) {
      if (!filters.ageRanges.includes(story.ageRange)) return false;
    }
    if (filters.genres.length > 0) {
      if (!filters.genres.includes(story.genre)) return false;
    }
    if (filters.durationBuckets.length > 0) {
      const bucket =
        story.durationBucketOverride != null
          ? story.durationBucketOverride
          : getDurationBucket(story.durationMinutes);
      if (!filters.durationBuckets.includes(bucket)) return false;
    }
    if (filters.moods.length > 0) {
      if (!filters.moods.includes(story.mood)) return false;
    }
    if (!matchesSeriesFilter(story, filters.seriesModes)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const sp = (b.sortPriority ?? 0) - (a.sortPriority ?? 0);
    if (sp !== 0) return sp;
    if (sort === 'newest') {
      const t = b.publishedAt.localeCompare(a.publishedAt);
      if (t !== 0) return t;
    } else {
      const p = b.popularityScore - a.popularityScore;
      if (p !== 0) return p;
    }
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

  return sorted;
}
