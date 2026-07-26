import { z } from 'zod';
import {
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
} from '@/constants/storyFilters';
import { ART_STYLE_OPTIONS } from '@/lib/story-studio/art-style-options';
import type { ArtStyleId } from '@/lib/story-studio/art-style-options';
import { PRESET_FIELD_TOGGLE_KEYS } from '@/lib/story-studio/preset-field-toggles';
import {
  TARGET_LENGTH_RANGE_IDS,
  remapTargetLengthRange,
} from '@/lib/story-studio/target-length';

const artStyleEnum = z.enum(
  ART_STYLE_OPTIONS.map((o) => o.id) as [ArtStyleId, ...ArtStyleId[]]
);

const studioAgeBand = z.enum([
  'toddler',
  '3-5',
  '5-7',
  '7-9',
  '9-12',
]);
const storyType = z.enum([
  'bedtime',
  'adventure',
  'funny',
  'mystery',
  'friendship',
  'learning',
  'fairy-tale',
  'animal-tale',
  'calming',
  'silly-chaos',
]);
const format = z.enum(['standalone', 'mini-series', 'series-episode']);
const tone = z.enum([
  'cozy',
  'funny',
  'whimsical',
  'exciting',
  'soothing',
  'heartfelt',
  'curious',
  'magical',
  'gentle-suspense',
]);
const lesson = z.enum([
  'bravery',
  'kindness',
  'patience',
  'sharing',
  'confidence',
  'teamwork',
  'bedtime-calm',
  'trying-new-things',
]);
const characterType = z.enum([
  'child',
  'animal',
  'robot',
  'sea-creature',
  'magical-creature',
  'vehicle',
  'superhero',
  'princess',
  'explorer',
]);
const setting = z.enum([
  'ocean',
  'forest',
  'city',
  'school',
  'space',
  'castle',
  'backyard',
  'dream-world',
  'undersea-kingdom',
]);
const narrationStyle = z.enum(['warm', 'playful', 'cinematic', 'sleepy-bedtime']);
const voiceEnergy = z.enum(['calm', 'expressive', 'lively', 'dramatic']);
const tagDensity = z.enum(['none', 'light', 'medium', 'expressive']);
const mode = z.enum(['quick', 'prompt']);

const genreHint = z.enum(
  GENRE_FILTER_OPTIONS.map((o) => o.id) as [string, ...string[]]
);
const moodHint = z.enum(
  MOOD_FILTER_OPTIONS.map((o) => o.id) as [string, ...string[]]
);

const targetLengthRange = z.enum(TARGET_LENGTH_RANGE_IDS);
const presetFieldToggleKey = z.enum(PRESET_FIELD_TOGGLE_KEYS);

/**
 * Maps legacy `targetMinutes` and old range ids (`2-3` | `3-4` | `4-5`)
 * into current `targetLengthRange` tiers.
 */
function coerceLegacyGenerationRequestPatch(val: unknown): unknown {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return val;
  const o = { ...(val as Record<string, unknown>) };
  if (o.targetLengthRange == null && typeof o.targetMinutes === 'number') {
    o.targetLengthRange = remapTargetLengthRange(o.targetMinutes);
    delete o.targetMinutes;
  } else if (o.targetLengthRange != null) {
    o.targetLengthRange = remapTargetLengthRange(o.targetLengthRange);
  }
  return o;
}

/** Partial patch from UI */
export const generationRequestPatchSchema = z.preprocess(
  coerceLegacyGenerationRequestPatch,
  z.object({
    mode: mode.optional(),
    studioAgeBand: studioAgeBand.optional(),
    storyType: storyType.optional(),
    format: format.optional(),
    targetLengthRange: targetLengthRange.optional(),
    episodeCount: z.number().int().min(1).max(12).optional(),
    tone: tone.optional(),
    lesson: lesson.optional(),
    characterType: characterType.optional(),
    setting: setting.optional(),
    narrationStyle: narrationStyle.optional(),
    voiceEnergy: voiceEnergy.optional(),
    tagDensity: tagDensity.optional(),
    artStyle: artStyleEnum.optional(),
    customArtStyle: z.string().max(600).optional(),
    simpleIdea: z.string().max(8000).optional(),
    customPrompt: z.string().max(12000).optional(),
    includeIntroMusic: z.boolean().optional(),
    generateCover: z.boolean().optional(),
    generateAudio: z.boolean().optional(),
    generateTheme: z.boolean().optional(),
    autoPublish: z.boolean().optional(),
    elevenLabsVoiceId: z.string().max(200).optional(),
    flavor: z.string().max(4000).optional(),
    coverArtDirection: z.string().max(4000).optional(),
    coverImagePromptDraft: z.string().max(16000).optional(),
    mainCoverAssetId: z.string().max(200).optional(),
    musicDirection: z.string().max(4000).optional(),
    genreHint: genreHint.optional(),
    moodHint: moodHint.optional(),
    presetFieldEnabled: z.record(presetFieldToggleKey, z.boolean()).optional(),
  })
);

export type GenerationRequestPatch = z.infer<typeof generationRequestPatchSchema>;
