import { z } from 'zod';

export const contentSpotlightTypeSchema = z.enum([
  'holiday',
  'awareness_month',
  'seasonal',
  'editorial',
]);

export const contentSpotlightStatusSchema = z.enum([
  'draft',
  'scheduled',
  'active',
  'paused',
  'expired',
]);

export const contentSpotlightRecurrenceSchema = z.enum([
  'one_time',
  'recurring_yearly',
]);

export const contentSpotlightBadgeCornerSchema = z.enum([
  'bottom_right',
  'bottom_left',
  'top_right',
  'top_left',
]);

export type ContentSpotlightBadgeCorner = z.infer<
  typeof contentSpotlightBadgeCornerSchema
>;

export const spotlightStoryInputSchema = z.object({
  storyId: z.string().regex(/^\d+$/, 'storyId must be numeric'),
  sortOrder: z.number().int(),
  isFeatured: z.boolean().optional().default(false),
  cardTitleOverride: z.string().nullable().optional(),
});

export const contentSpotlightUpsertSchema = z.object({
  internalName: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: contentSpotlightTypeSchema,
  shortBlurb: z.string().min(1).max(2000),
  longDescription: z.string().nullable().optional(),
  popupTitle: z.string().min(1).max(300),
  popupBody: z.string().min(1).max(8000),
  infoBarText: z.string().min(1).max(2000),
  ctaLabel: z.string().max(120).nullable().optional(),
  ctaUrl: z
    .union([z.string().url(), z.literal('')])
    .nullable()
    .optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  timezone: z.string().min(1).max(80).optional().default('UTC'),
  recurrence: contentSpotlightRecurrenceSchema.optional().default('one_time'),
  status: contentSpotlightStatusSchema.optional().default('draft'),
  publishedAt: z.string().datetime().nullable().optional(),
  showBadge: z.boolean().optional().default(true),
  badgeCorner: contentSpotlightBadgeCornerSchema
    .optional()
    .default('bottom_right'),
  showPopup: z.boolean().optional().default(true),
  showInfoBar: z.boolean().optional().default(true),
  featureOnHomepage: z.boolean().optional().default(false),
  featureOnLibraryPage: z.boolean().optional().default(false),
  priority: z.number().int().optional().default(0),
  themeToken: z.string().max(80).nullable().optional(),
  badgeAssetId: z.string().cuid().nullable().optional(),
  stories: z.array(spotlightStoryInputSchema).optional().default([]),
});

export type ContentSpotlightUpsertInput = z.infer<
  typeof contentSpotlightUpsertSchema
>;
