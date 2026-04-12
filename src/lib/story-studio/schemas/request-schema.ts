import { z } from 'zod';
import {
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
} from '@/constants/storyFilters';

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
const tagDensity = z.enum(['light', 'medium', 'expressive']);
const mode = z.enum(['quick', 'prompt']);

const genreHint = z.enum(
  GENRE_FILTER_OPTIONS.map((o) => o.id) as [string, ...string[]]
);
const moodHint = z.enum(
  MOOD_FILTER_OPTIONS.map((o) => o.id) as [string, ...string[]]
);

const targetLengthRange = z.enum(['2-3', '3-4', '4-5']);

/** Maps legacy `targetMinutes` from DB/presets into `targetLengthRange`. */
function coerceLegacyGenerationRequestPatch(val: unknown): unknown {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return val;
  const o = { ...(val as Record<string, unknown>) };
  if (o.targetLengthRange == null && typeof o.targetMinutes === 'number') {
    const m = o.targetMinutes as number;
    o.targetLengthRange = m <= 3 ? '2-3' : m === 4 ? '3-4' : '4-5';
    delete o.targetMinutes;
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
    musicDirection: z.string().max(4000).optional(),
    genreHint: genreHint.optional(),
    moodHint: moodHint.optional(),
  })
);

export type GenerationRequestPatch = z.infer<typeof generationRequestPatchSchema>;
