import {
  AGE_FILTER_OPTIONS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
  SORT_OPTIONS,
  type AgeRangeId,
  type GenreId,
  type MoodId,
  type SortOption,
} from '@/constants/storyFilters';
import {
  defaultStoryFiltersState,
  type StoryFiltersState,
} from '@/types/story';

function firstString(
  v: string | string[] | undefined
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const AGE_IDS = new Set<string>(AGE_FILTER_OPTIONS.map((o) => o.id));
const GENRE_IDS = new Set<string>(GENRE_FILTER_OPTIONS.map((o) => o.id));
const MOOD_IDS = new Set<string>(MOOD_FILTER_OPTIONS.map((o) => o.id));
const SORT_IDS = new Set<string>(SORT_OPTIONS.map((o) => o.id));

/**
 * Maps public library URLs (e.g. footer ?sort=new) to filter/sort state.
 */
export function parseLibrarySearchParams(
  raw: Record<string, string | string[] | undefined>
): { sort: SortOption; filters: StoryFiltersState } {
  const filters = defaultStoryFiltersState();
  let sort: SortOption = 'newest';

  const sortVal = firstString(raw.sort)?.toLowerCase();
  if (sortVal === 'popular') {
    sort = 'popular';
  } else if (sortVal === 'new' || sortVal === 'newest') {
    sort = 'newest';
  } else if (sortVal && SORT_IDS.has(sortVal)) {
    sort = sortVal as SortOption;
  }

  const ageVal = firstString(raw.age);
  if (ageVal) {
    const seen = new Set<string>();
    for (const part of ageVal.split(',')) {
      const id = part.trim();
      if (!id || seen.has(id)) continue;
      if (AGE_IDS.has(id)) {
        seen.add(id);
        filters.ageRanges.push(id as AgeRangeId);
      }
    }
  }

  const genreVal = firstString(raw.genre);
  if (genreVal && GENRE_IDS.has(genreVal)) {
    filters.genres = [genreVal as GenreId];
  }

  const moodVal = firstString(raw.mood);
  if (moodVal && MOOD_IDS.has(moodVal)) {
    filters.moods = [moodVal as MoodId];
  }

  return { sort, filters };
}
