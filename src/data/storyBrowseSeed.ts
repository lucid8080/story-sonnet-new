import type { AgeRangeId, GenreId, MoodId } from '@/constants/storyFilters';

export type StoryBrowseSeedRow = {
  ageRange: AgeRangeId;
  genre: GenreId;
  mood: MoodId;
  popularityScore: number;
  publishedAt: string;
  isFeatured?: boolean;
  /** When set, overrides inference from episode count. */
  isSeries?: boolean;
};

const FALLBACK_SEED: StoryBrowseSeedRow = {
  ageRange: '6-8',
  genre: 'adventure',
  mood: 'uplifting',
  popularityScore: 10,
  publishedAt: '2024-01-01T12:00:00.000Z',
};

/** Per-slug browse metadata until fields live in the database. */
export const STORY_BROWSE_SEED: Record<string, StoryBrowseSeedRow> = {
  'the-ube-folk-of-amihan-hollow': {
    ageRange: '6-8',
    genre: 'fantasy',
    mood: 'uplifting',
    popularityScore: 92,
    publishedAt: '2025-11-02T10:00:00.000Z',
    isFeatured: true,
  },
  'the-adventures-of-zubie-and-robo-rex': {
    ageRange: '3-5',
    genre: 'friendship',
    mood: 'bedtime',
    popularityScore: 88,
    publishedAt: '2025-10-18T14:30:00.000Z',
    isFeatured: true,
  },
  'nori-and-the-pocket-meadow': {
    ageRange: '6-8',
    genre: 'animals',
    mood: 'calm-quiet',
    popularityScore: 76,
    publishedAt: '2025-09-05T09:15:00.000Z',
  },
  'juniper-and-the-lantern-library': {
    ageRange: '6-8',
    genre: 'fantasy',
    mood: 'bedtime',
    popularityScore: 81,
    publishedAt: '2025-10-01T16:00:00.000Z',
  },
  'the-secret-map-of-the-7641-islands': {
    ageRange: '6-8',
    genre: 'adventure',
    mood: 'car-ride',
    popularityScore: 70,
    publishedAt: '2025-08-22T11:45:00.000Z',
  },
  'pip-and-the-moonlight-mailbox': {
    ageRange: '3-5',
    genre: 'adventure',
    mood: 'bedtime',
    popularityScore: 95,
    publishedAt: '2025-11-20T08:00:00.000Z',
    isFeatured: true,
  },
  'blocky-explores-mine-world': {
    ageRange: '6-8',
    genre: 'funny',
    mood: 'uplifting',
    popularityScore: 84,
    publishedAt: '2025-10-12T13:20:00.000Z',
  },
  'keepers-of-turtleshell-city': {
    ageRange: '6-8',
    genre: 'adventure',
    mood: 'learning-time',
    popularityScore: 79,
    publishedAt: '2025-09-28T07:00:00.000Z',
  },
  'luna-and-the-starlight-garden': {
    ageRange: '3-5',
    genre: 'bedtime',
    mood: 'bedtime',
    popularityScore: 62,
    publishedAt: '2025-07-10T19:00:00.000Z',
  },
  'detective-chipmunks-first-case': {
    ageRange: '6-8',
    genre: 'mystery',
    mood: 'learning-time',
    popularityScore: 58,
    publishedAt: '2025-06-15T15:30:00.000Z',
  },
  'teds-counting-train': {
    ageRange: '3-5',
    genre: 'educational',
    mood: 'learning-time',
    popularityScore: 55,
    publishedAt: '2025-05-01T12:00:00.000Z',
  },
  'maya-and-the-laughing-cloud': {
    ageRange: '6-8',
    genre: 'funny',
    mood: 'uplifting',
    popularityScore: 73,
    publishedAt: '2025-08-01T10:00:00.000Z',
  },
};

export function getBrowseSeedForSlug(slug: string): StoryBrowseSeedRow {
  return STORY_BROWSE_SEED[slug] ?? FALLBACK_SEED;
}
