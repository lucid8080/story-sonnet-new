import type { AgeRangeId, GenreId, MoodId } from '@/constants/storyFilters';
import {
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
} from '@/constants/storyFilters';
import type {
  GenerationRequest,
  StudioAgeBand,
  StoryTypeId,
  TargetLengthRangeId,
} from '@/lib/story-studio/types';
import type { GenerationRequestPatch } from '@/lib/story-studio/schemas/request-schema';
import { generationRequestPatchSchema } from '@/lib/story-studio/schemas/request-schema';

export function studioAgeToCatalogAgeRange(band: StudioAgeBand): AgeRangeId {
  switch (band) {
    case 'toddler':
      return '0-2';
    case '3-5':
      return '3-5';
    case '5-7':
    case '7-9':
      return '6-8';
    case '9-12':
      return '9-12';
    default:
      return '6-8';
  }
}

export function catalogAgeLabel(band: StudioAgeBand): string {
  const labels: Record<StudioAgeBand, string> = {
    toddler: 'Toddler (0–2)',
    '3-5': '3–5 years',
    '5-7': '5–7 years',
    '7-9': '7–9 years',
    '9-12': '9–12 years',
  };
  return labels[band];
}

/** Map story type chips to closest catalog genre for Story row. */
export function storyTypeToGenre(storyType: StoryTypeId): GenreId | null {
  const m: Partial<Record<StoryTypeId, GenreId>> = {
    bedtime: 'bedtime',
    adventure: 'adventure',
    funny: 'funny',
    mystery: 'mystery',
    friendship: 'friendship',
    learning: 'educational',
    'fairy-tale': 'fantasy',
    'animal-tale': 'animals',
    calming: 'bedtime',
    'silly-chaos': 'funny',
  };
  return m[storyType] ?? null;
}

function safeGenreHint(id: string | undefined): GenreId | null {
  if (!id) return null;
  return GENRE_FILTER_OPTIONS.some((o) => o.id === id) ? (id as GenreId) : null;
}

function safeMoodHint(id: string | undefined): MoodId | null {
  if (!id) return null;
  return MOOD_FILTER_OPTIONS.some((o) => o.id === id) ? (id as MoodId) : null;
}

export function toneToMood(tone: GenerationRequest['tone']): MoodId | null {
  const m: Record<GenerationRequest['tone'], MoodId | null> = {
    cozy: 'calm-quiet',
    funny: 'uplifting',
    whimsical: 'uplifting',
    exciting: 'car-ride',
    soothing: 'bedtime',
    heartfelt: 'uplifting',
    curious: 'learning-time',
    magical: 'uplifting',
    'gentle-suspense': 'calm-quiet',
  };
  return m[tone] ?? null;
}

/** Single-number hint for catalog duration when LLM omits `estimatedRuntimeMinutes`. */
export function targetLengthRangeToApproxMinutes(
  range: TargetLengthRangeId
): number {
  switch (range) {
    case '2-3':
      return 3;
    case '3-4':
      return 4;
    case '4-5':
      return 5;
    default:
      return 4;
  }
}

const BASE_REQUEST: Omit<
  GenerationRequest,
  | 'catalogAgeRange'
  | 'catalogGenre'
  | 'catalogMood'
  | 'flavor'
  | 'coverArtDirection'
  | 'musicDirection'
> = {
  mode: 'quick',
  studioAgeBand: '5-7',
  storyType: 'adventure',
  format: 'standalone',
  targetLengthRange: '3-4',
  episodeCount: 1,
  tone: 'whimsical',
  lesson: 'kindness',
  characterType: 'animal',
  setting: 'forest',
  narrationStyle: 'warm',
  voiceEnergy: 'expressive',
  tagDensity: 'medium',
  simpleIdea: '',
  customPrompt: '',
  includeIntroMusic: true,
  generateCover: true,
  generateAudio: true,
  generateTheme: true,
  autoPublish: false,
};

export function mergeGenerationRequest(
  base: GenerationRequest,
  patch: GenerationRequestPatch
): GenerationRequest {
  const merged = { ...base, ...patch };
  merged.catalogAgeRange = studioAgeToCatalogAgeRange(merged.studioAgeBand);
  merged.catalogGenre =
    safeGenreHint(merged.genreHint) ?? storyTypeToGenre(merged.storyType);
  merged.catalogMood =
    safeMoodHint(merged.moodHint) ?? toneToMood(merged.tone);
  if (merged.format === 'standalone') {
    merged.episodeCount = 1;
  }
  return merged;
}

export function defaultGenerationRequest(): GenerationRequest {
  return mergeGenerationRequest(
    {
      ...BASE_REQUEST,
      catalogAgeRange: '6-8',
      catalogGenre: storyTypeToGenre(BASE_REQUEST.storyType),
      catalogMood: toneToMood(BASE_REQUEST.tone),
    },
    {}
  );
}

/** Merge preset.defaults JSON from DB into request shape. */
export function applyPresetDefaults(
  req: GenerationRequest,
  presetDefaults: Record<string, unknown> | null | undefined
): GenerationRequest {
  if (!presetDefaults || typeof presetDefaults !== 'object') return req;
  const parsed = generationRequestPatchSchema.safeParse(presetDefaults);
  if (!parsed.success) return req;
  return mergeGenerationRequest(req, parsed.data);
}

/** Load GenerationRequest from draft JSON; falls back to defaults when invalid. */
export function parseStoredGenerationRequest(raw: unknown): GenerationRequest {
  const base = defaultGenerationRequest();
  if (!raw || typeof raw !== 'object') return base;
  const parsed = generationRequestPatchSchema.safeParse(raw);
  if (!parsed.success) return base;
  return mergeGenerationRequest(base, parsed.data);
}

export function resolveDraftGenerationRequest(draft: {
  request: unknown;
  preset: { defaults: unknown } | null;
}): GenerationRequest {
  const base = defaultGenerationRequest();
  const withPreset = draft.preset?.defaults
    ? applyPresetDefaults(base, draft.preset.defaults as Record<string, unknown>)
    : base;
  if (!draft.request || typeof draft.request !== 'object') return withPreset;
  const parsed = generationRequestPatchSchema.safeParse(draft.request);
  if (!parsed.success) return withPreset;
  return mergeGenerationRequest(withPreset, parsed.data);
}
