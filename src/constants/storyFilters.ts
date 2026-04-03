export const AGE_FILTER_OPTIONS = [
  { id: '0-2' as const, label: '0–2 years' },
  { id: '3-5' as const, label: '3–5 years' },
  { id: '6-8' as const, label: '6–8 years' },
  { id: '9-12' as const, label: '9–12 years' },
] as const;

export const GENRE_FILTER_OPTIONS = [
  { id: 'adventure' as const, label: 'Adventure' },
  { id: 'bedtime' as const, label: 'Bedtime' },
  { id: 'fantasy' as const, label: 'Fantasy' },
  { id: 'animals' as const, label: 'Animals' },
  { id: 'friendship' as const, label: 'Friendship' },
  { id: 'educational' as const, label: 'Educational' },
  { id: 'funny' as const, label: 'Funny' },
  { id: 'mystery' as const, label: 'Mystery' },
] as const;

export const DURATION_FILTER_OPTIONS = [
  { id: 'under5' as const, label: 'Under 5 min' },
  { id: '5-10' as const, label: '5–10 min' },
  { id: '10-15' as const, label: '10–15 min' },
  { id: '15plus' as const, label: '15+ min' },
] as const;

export const MOOD_FILTER_OPTIONS = [
  { id: 'bedtime' as const, label: 'Bedtime' },
  { id: 'calm-quiet' as const, label: 'Calm / quiet time' },
  { id: 'learning-time' as const, label: 'Learning time' },
  { id: 'car-ride' as const, label: 'Car ride' },
  { id: 'quick-listen' as const, label: 'Quick listen' },
  { id: 'uplifting' as const, label: 'Uplifting' },
] as const;

export const SERIES_FILTER_OPTIONS = [
  { id: 'series' as const, label: 'Series' },
  { id: 'standalone' as const, label: 'Standalone' },
] as const;

export const SORT_OPTIONS = [
  { id: 'newest' as const, label: 'Newest' },
  { id: 'popular' as const, label: 'Popular' },
] as const;

export const FILTER_SECTION_LABELS = {
  age: 'Age',
  genre: 'Genre',
  duration: 'Length',
  mood: 'Vibe / when to listen',
  series: 'Series or one-off',
} as const;

export type AgeRangeId = (typeof AGE_FILTER_OPTIONS)[number]['id'];
export type GenreId = (typeof GENRE_FILTER_OPTIONS)[number]['id'];
export type DurationBucketId = (typeof DURATION_FILTER_OPTIONS)[number]['id'];
export type MoodId = (typeof MOOD_FILTER_OPTIONS)[number]['id'];
export type SeriesFilterId = (typeof SERIES_FILTER_OPTIONS)[number]['id'];
export type SortOption = (typeof SORT_OPTIONS)[number]['id'];
