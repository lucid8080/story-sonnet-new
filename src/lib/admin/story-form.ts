import type { AgeRangeId, DurationBucketId } from '@/constants/storyFilters';
import type { GenreId, MoodId } from '@/constants/storyFilters';

export type EpisodeFormState = {
  id: string;
  episodeNumber: number;
  title: string;
  slug: string;
  summary: string;
  durationMinutes: string;
  durationSeconds: string;
  audioUrl: string;
  /** Private R2 object key (e.g. audio/slug/episode-1.mp3); optional if using public audio URL only */
  audioStorageKey: string;
  isPublished: boolean;
  isPremium: boolean;
  isFreePreview: boolean;
  label: string;
};

export type StoryFormState = {
  slug: string;
  title: string;
  seriesTitle: string;
  subtitle: string;
  summary: string;
  fullDescription: string;
  coverUrl: string;
  accent: string;
  ageRange: AgeRangeId;
  genre: GenreId | '';
  mood: MoodId | '';
  durationMinutes: string;
  durationBucket: DurationBucketId | '' | 'auto';
  durationLabel: string;
  isSeries: boolean;
  seriesTagline: string;
  universe: string;
  readingLevel: string;
  topics: string;
  characterTags: string;
  cardTitleOverride: string;
  cardDescriptionOverride: string;
  badgeLabelOverride: string;
  popularityScore: string;
  sortPriority: string;
  publishedAt: string;
  isFeatured: boolean;
  isPremium: boolean;
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
  ageGroup: string;
  episodes: EpisodeFormState[];
};

export function emptyEpisodeForm(id: string, episodeNumber: number): EpisodeFormState {
  return {
    id,
    episodeNumber,
    title: '',
    slug: '',
    summary: '',
    durationMinutes: '',
    durationSeconds: '',
    audioUrl: '',
    audioStorageKey: '',
    isPublished: false,
    isPremium: false,
    isFreePreview: false,
    label: '',
  };
}

export function defaultStoryFormState(): StoryFormState {
  return {
    slug: '',
    title: '',
    seriesTitle: '',
    subtitle: '',
    summary: '',
    fullDescription: '',
    coverUrl: '',
    accent: '',
    ageRange: '6-8',
    genre: '',
    mood: '',
    durationMinutes: '',
    durationBucket: 'auto',
    durationLabel: '',
    isSeries: false,
    seriesTagline: '',
    universe: '',
    readingLevel: '',
    topics: '',
    characterTags: '',
    cardTitleOverride: '',
    cardDescriptionOverride: '',
    badgeLabelOverride: '',
    popularityScore: '10',
    sortPriority: '0',
    publishedAt: '',
    isFeatured: false,
    isPremium: false,
    isPublished: false,
    metaTitle: '',
    metaDescription: '',
    ageGroup: '',
    episodes: [emptyEpisodeForm(`new-${crypto.randomUUID()}`, 1)],
  };
}

export function cloneStoryFormState(s: StoryFormState): StoryFormState {
  return {
    ...s,
    episodes: s.episodes.map((e) => ({ ...e })),
  };
}

export function formsEqual(a: StoryFormState, b: StoryFormState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
