import type {
  AgeRangeId,
  DurationBucketId,
  GenreId,
  MoodId,
  SeriesFilterId,
  SortOption,
} from '@/constants/storyFilters';

export type {
  AgeRangeId,
  DurationBucketId,
  GenreId,
  MoodId,
  SeriesFilterId,
  SortOption,
};

export type BrowseStory = {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  shortDescription: string;
  ageRange: AgeRangeId;
  genre: GenreId;
  durationMinutes: number;
  /** When set, library duration filter uses this instead of deriving from minutes. */
  durationBucketOverride?: DurationBucketId | null;
  mood: MoodId;
  isSeries: boolean;
  seriesName: string | null;
  popularityScore: number;
  publishedAt: string;
  /** ISO timestamp for grid ordering (createdAt → publishedAt → seed). */
  listedAt: string;
  sortPriority?: number;
  isFeatured?: boolean;
  isPremium?: boolean;
};

export type StoryFiltersState = {
  ageRanges: AgeRangeId[];
  genres: GenreId[];
  durationBuckets: DurationBucketId[];
  moods: MoodId[];
  seriesModes: SeriesFilterId[];
};

export function defaultStoryFiltersState(): StoryFiltersState {
  return {
    ageRanges: [],
    genres: [],
    durationBuckets: [],
    moods: [],
    seriesModes: [],
  };
}

export type ActiveFilterChip = {
  key: string;
  label: string;
  group:
    | 'ageRanges'
    | 'genres'
    | 'durationBuckets'
    | 'moods'
    | 'seriesModes';
  value: string;
};
