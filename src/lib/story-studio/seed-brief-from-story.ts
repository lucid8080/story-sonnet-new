import {
  AGE_FILTER_OPTIONS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
  type AgeRangeId,
  type GenreId,
  type MoodId,
} from '@/constants/storyFilters';
import type { BriefPayloadParsed } from '@/lib/story-studio/schemas/llm-output';
import { STORY_STUDIO_MAX_ESTIMATED_RUNTIME_MINUTES } from '@/lib/story-studio/constants';

const ageIds = new Set<string>(AGE_FILTER_OPTIONS.map((o) => o.id));
const genreIds = new Set<string>(GENRE_FILTER_OPTIONS.map((o) => o.id));
const moodIds = new Set<string>(MOOD_FILTER_OPTIONS.map((o) => o.id));

export type StoryFieldsForBriefSeed = {
  seriesTitle: string;
  summary: string | null;
  seriesTagline: string | null;
  ageRange: string | null;
  genre: string | null;
  mood: string | null;
  durationMinutes: number | null;
};

/**
 * Seed a Studio brief from library Story catalog fields when linking
 * Story Series → Story Studio for the first time.
 */
export function seedBriefFromStory(
  story: StoryFieldsForBriefSeed
): BriefPayloadParsed {
  const seriesTitle = story.seriesTitle.trim() || 'Untitled series';
  const summary =
    story.summary?.trim() ||
    'Add a short summary for cards and the library.';
  const ageRange: AgeRangeId = ageIds.has(story.ageRange ?? '')
    ? (story.ageRange as AgeRangeId)
    : '6-8';
  const suggestedGenre: GenreId | null = genreIds.has(story.genre ?? '')
    ? (story.genre as GenreId)
    : null;
  const suggestedMood: MoodId | null = moodIds.has(story.mood ?? '')
    ? (story.mood as MoodId)
    : null;
  let estimatedRuntimeMinutes = 3;
  if (
    story.durationMinutes != null &&
    Number.isFinite(story.durationMinutes)
  ) {
    estimatedRuntimeMinutes = Math.min(
      STORY_STUDIO_MAX_ESTIMATED_RUNTIME_MINUTES,
      Math.max(1, Math.round(story.durationMinutes))
    );
  }

  return {
    seriesTitle,
    summary,
    logline: story.seriesTagline?.trim() ?? '',
    characters: ['Main character'],
    settingSketch: '',
    suggestedGenre,
    suggestedMood,
    ageRange,
    episodeOutline: [],
    coverArtPrompt: '',
    musicPrompt: '',
    estimatedRuntimeMinutes,
    safetyNotes: '',
    characterGuides: [],
    sceneGuides: [],
  };
}
