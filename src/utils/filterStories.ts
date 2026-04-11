import type { SortOption } from '@/constants/storyFilters';
import type { BrowseStory, StoryFiltersState } from '@/types/story';
import { getDurationBucket } from '@/utils/durationBucket';
import {
  browseStoryToLibraryGridSortKey,
  compareLibraryGridRows,
} from '@/utils/libraryGridSort';

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

  const sorted = [...filtered].sort((a, b) =>
    compareLibraryGridRows(
      browseStoryToLibraryGridSortKey(a),
      browseStoryToLibraryGridSortKey(b),
      sort
    )
  );

  return sorted;
}
