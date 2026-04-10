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

/** LLMs often emit `{ name, description }` per character; we need `string[]`. */
function coerceBriefCharactersField(v: unknown): unknown {
  if (v == null) return [];
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? [t] : [];
  }
  if (!Array.isArray(v)) return v;
  return v
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const o = entry as Record<string, unknown>;
        const name =
          typeof o.name === 'string'
            ? o.name.trim()
            : typeof o.character === 'string'
              ? o.character.trim()
              : typeof o.title === 'string'
                ? o.title.trim()
                : null;
        const detail =
          typeof o.description === 'string'
            ? o.description.trim()
            : typeof o.role === 'string'
              ? o.role.trim()
              : typeof o.personality === 'string'
                ? o.personality.trim()
                : typeof o.want === 'string'
                  ? o.want.trim()
                  : null;
        if (name && detail) return `${name} — ${detail}`;
        if (name) return name;
        const parts = Object.entries(o)
          .filter(
            ([, val]) =>
              val != null &&
              (typeof val === 'string' || typeof val === 'number')
          )
          .map(([k, val]) => `${k}: ${String(val).trim()}`);
        if (parts.length) return parts.join('. ');
        try {
          return JSON.stringify(o);
        } catch {
          return '';
        }
      }
      if (entry != null) return String(entry).trim();
      return '';
    })
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
}

/** Unwrap + coerce so validation never depends on Zod preprocess in the bundle. */
function normalizeBriefCharactersValue(v: unknown): string[] {
  const u = unwrapBriefCharactersField(v);
  const c = coerceBriefCharactersField(u);
  if (Array.isArray(c)) {
    return c.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  return [];
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
  characters: z.array(z.string().min(1)),
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

/** Some models wrap the list as `{ items: [...] }` or use numeric keys. */
function unwrapBriefCharactersField(v: unknown): unknown {
  if (v == null || Array.isArray(v) || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  for (const k of ['items', 'list', 'people', 'cast', 'characters'] as const) {
    const inner = o[k];
    if (Array.isArray(inner)) return inner;
  }
  const keys = Object.keys(o);
  const allNumeric =
    keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
  if (allNumeric) {
    return keys
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => o[key]);
  }
  return v;
}

function normalizeBriefJsonBeforeParse(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const o = { ...(data as Record<string, unknown>) };
  if ('characters' in o) {
    o.characters = normalizeBriefCharactersValue(o.characters);
  }
  return o;
}

export function parseJsonToBrief(raw: string) {
  const text = stripJsonFence(raw);
  const data = JSON.parse(text) as unknown;
  const normalized = normalizeBriefJsonBeforeParse(data);
  return briefPayloadSchema.safeParse(normalized);
}

export function parseJsonToScriptPackage(raw: string) {
  const text = stripJsonFence(raw);
  const data = JSON.parse(text) as unknown;
  return scriptPackagePayloadSchema.safeParse(data);
}
