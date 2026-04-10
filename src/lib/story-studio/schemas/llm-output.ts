import { z } from 'zod';
import { STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE } from '@/lib/story-studio/constants';
import {
  AGE_FILTER_OPTIONS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
} from '@/constants/storyFilters';

const ageTuple = AGE_FILTER_OPTIONS.map((o) => o.id) as [string, ...string[]];
const genreTuple = GENRE_FILTER_OPTIONS.map((o) => o.id) as [
  string,
  ...string[],
];
const moodTuple = MOOD_FILTER_OPTIONS.map((o) => o.id) as [string, ...string[]];

const ageRangeSchema = z.enum(ageTuple);
const genreSchema = z.enum(genreTuple).nullable();
const moodSchema = z.enum(moodTuple).nullable();

/** LLMs often emit JSON `null` for omitted fields; Zod `.optional()` only allows `undefined`. */
function nullToUndefined(v: unknown): unknown {
  return v === null ? undefined : v;
}

function nullToEmptyString(v: unknown): string {
  return v == null ? '' : String(v);
}

function nullToStringArray(v: unknown): string[] {
  if (v == null) return [];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function normalizeForComparison(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '');
}

export const briefPayloadSchema = z.object({
  title: z.string().min(1),
  seriesTitle: z.string().min(1),
  summary: z.string().min(1),
  logline: z.string(),
  characters: z.array(z.string()),
  settingSketch: z.string(),
  suggestedGenre: genreSchema.optional().default(null),
  suggestedMood: moodSchema.optional().default(null),
  ageRange: ageRangeSchema,
  episodeOutline: z.array(
    z.object({
      title: z.string(),
      beat: z.string(),
    })
  ),
  coverArtPrompt: z.string(),
  musicPrompt: z.string(),
  estimatedRuntimeMinutes: z.number().min(1).max(5),
  safetyNotes: z.string(),
});

export const scriptEpisodePayloadSchema = z.object({
  title: z.string().min(1),
  summary: z.preprocess(nullToEmptyString, z.string().trim().min(1).max(280)),
  scriptText: z
    .string()
    .min(1)
    .max(STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE),
  hookEnding: z.preprocess(
    nullToUndefined,
    z.string().optional()
  ),
}).superRefine((episode, ctx) => {
  const summary = normalizeForComparison(episode.summary);
  const script = normalizeForComparison(episode.scriptText);
  if (!summary || !script) return;
  if (summary === script || script.includes(summary)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['summary'],
      message:
        'Episode summary must be a short unique blurb, not copied from script text.',
    });
  }
});

const tagDensitySchema = z.enum(['light', 'medium', 'expressive']);

export const scriptPackagePayloadSchema = z.object({
  title: z.string().min(1),
  seriesTitle: z.string().min(1),
  summary: z.string().min(1),
  fullScript: z.preprocess(nullToUndefined, z.string().optional()),
  episodes: z.array(scriptEpisodePayloadSchema),
  coverArtPrompt: z.preprocess(nullToEmptyString, z.string()),
  musicPrompt: z.preprocess(nullToEmptyString, z.string()),
  narrationNotes: z.preprocess(nullToEmptyString, z.string()),
  estimatedRuntimeMinutes: z.number().min(1).max(5),
  ageRange: ageRangeSchema,
  tags: z.preprocess(nullToStringArray, z.array(z.string())),
  expressionTagDensity: tagDensitySchema,
});

export type BriefPayloadParsed = z.infer<typeof briefPayloadSchema>;
export type ScriptPackagePayloadParsed = z.infer<
  typeof scriptPackagePayloadSchema
>;

export function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  }
  return s.trim();
}

export function parseJsonToBrief(raw: string) {
  const text = stripJsonFence(raw);
  const data = JSON.parse(text) as unknown;
  return briefPayloadSchema.safeParse(data);
}

export function parseJsonToScriptPackage(raw: string) {
  const text = stripJsonFence(raw);
  const data = JSON.parse(text) as unknown;
  return scriptPackagePayloadSchema.safeParse(data);
}
