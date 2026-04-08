import { z } from 'zod';
import {
  AGE_FILTER_OPTIONS,
  DURATION_FILTER_OPTIONS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
} from '@/constants/storyFilters';
import { STORY_SLUG_REGEX } from '@/lib/slug';

const slugRegex = STORY_SLUG_REGEX;

const ageTuple = AGE_FILTER_OPTIONS.map((o) => o.id) as [
  string,
  ...string[],
];
const genreTuple = GENRE_FILTER_OPTIONS.map((o) => o.id) as [
  string,
  ...string[],
];
const moodTuple = MOOD_FILTER_OPTIONS.map((o) => o.id) as [string, ...string[]];
const durationBucketTuple = DURATION_FILTER_OPTIONS.map((o) => o.id) as [
  string,
  ...string[],
];

export const ageRangeIdSchema = z.enum(ageTuple);
export const genreIdSchema = z.enum(genreTuple);
export const moodIdSchema = z.enum(moodTuple);
export const durationBucketIdSchema = z.enum(durationBucketTuple);

export const adminEpisodeSchema = z.object({
  id: z.string().min(1),
  episodeNumber: z.number().int().min(1),
  title: z.string().min(1, 'Episode title is required'),
  slug: z
    .string()
    .nullable()
    .optional()
    .transform((s) => {
      if (s == null || s === '') return null;
      return s.trim().toLowerCase();
    })
    .refine((s) => s === null || slugRegex.test(s), {
      message: 'Episode slug must be lowercase letters, numbers, and hyphens',
    }),
  summary: z.string().nullable().optional(),
  // Legacy/manual fallback only; server prefers duration parsed from audio object.
  durationMinutes: z.number().min(0).nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  audioStorageKey: z.string().nullable().optional(),
  isPublished: z.boolean().optional().default(false),
  isPremium: z.boolean().optional().default(false),
  isFreePreview: z.boolean().optional().default(false),
  label: z.string().nullable().optional(),
});

export const adminStoryUpsertSchema = z.object({
  slug: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase())
    .refine((s) => slugRegex.test(s), {
      message: 'Slug must be lowercase letters, numbers, and hyphens',
    }),
  title: z.string().min(1, 'Title is required'),
  seriesTitle: z.string().min(1, 'Series name is required'),
  subtitle: z.string().nullable().optional(),
  summary: z.string().min(1, 'Short description is required'),
  fullDescription: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  accent: z.string().nullable().optional(),
  ageRange: ageRangeIdSchema,
  genre: genreIdSchema.nullable().optional(),
  mood: moodIdSchema.nullable().optional(),
  durationMinutes: z.number().min(0).nullable().optional(),
  durationBucket: durationBucketIdSchema.nullable().optional(),
  durationLabel: z.string().nullable().optional(),
  isSeries: z.boolean(),
  seriesTagline: z.string().nullable().optional(),
  universe: z.string().nullable().optional(),
  readingLevel: z.string().nullable().optional(),
  topics: z.array(z.string()).optional().default([]),
  characterTags: z.array(z.string()).optional().default([]),
  cardTitleOverride: z.string().nullable().optional(),
  cardDescriptionOverride: z.string().nullable().optional(),
  badgeLabelOverride: z.string().nullable().optional(),
  popularityScore: z.number().int().optional().default(10),
  sortPriority: z.number().int().optional().default(0),
  publishedAt: z.preprocess(
    (v) => (v === '' ? null : v),
    z
      .string()
      .nullable()
      .optional()
      .refine(
        (v) => v == null || !Number.isNaN(Date.parse(v)),
        { message: 'Invalid published date' }
      )
  ),
  isFeatured: z.boolean().optional().default(false),
  isPremium: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(false),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ageGroup: z.string().nullable().optional(),
  episodes: z.array(adminEpisodeSchema).optional().default([]),
});

export type AdminStoryUpsertInput = z.infer<typeof adminStoryUpsertSchema>;
export type AdminEpisodeInput = z.infer<typeof adminEpisodeSchema>;
