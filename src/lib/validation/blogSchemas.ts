import { z } from 'zod';
import { STORY_SLUG_REGEX } from '@/lib/slug';

const slugRegex = STORY_SLUG_REGEX;

export const blogPostStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
]);

export const blogGenerationSourceSchema = z.enum([
  'MANUAL',
  'AI_SCRATCH',
  'AI_KEYWORDS',
  'AI_REWRITE',
]);

const slugField = z
  .string()
  .min(1)
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => slugRegex.test(s), {
    message: 'Slug must be lowercase letters, numbers, and hyphens',
  });

export const adminBlogPostUpsertSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(300),
    slug: slugField,
    excerpt: z.string().max(500).nullable().optional(),
    contentHtml: z.string().default(''),
    status: blogPostStatusSchema,
    featuredImageUrl: z.string().nullable().optional(),
    featuredImageStorageKey: z.string().nullable().optional(),
    seoTitle: z.string().max(70).nullable().optional(),
    seoDescription: z.string().max(320).nullable().optional(),
    canonicalUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
    authorName: z.string().max(120).nullable().optional(),
    authorId: z.string().nullable().optional(),
    publishedAt: z.coerce.date().nullable().optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    isFeatured: z.boolean().optional(),
    allowComments: z.boolean().optional(),
    readingTimeMinutes: z.number().int().min(1).max(240).nullable().optional(),
    metaKeywords: z.string().max(500).nullable().optional(),
    aiPrompt: z.string().max(20000).nullable().optional(),
    aiKeywords: z.unknown().nullable().optional(),
    generationSource: blogGenerationSourceSchema.optional(),
    categoryId: z.string().nullable().optional(),
    tagIds: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'SCHEDULED' && !data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Scheduled posts require a scheduled date',
        path: ['scheduledAt'],
      });
    }
  });

export type AdminBlogPostUpsertInput = z.infer<typeof adminBlogPostUpsertSchema>;

export const adminBlogCategorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugField,
  description: z.string().max(2000).nullable().optional(),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex color like #aabbcc')
    .nullable()
    .optional(),
});

export type AdminBlogCategoryInput = z.infer<typeof adminBlogCategorySchema>;

export const adminBlogTagSchema = z.object({
  name: z.string().min(1).max(80),
  slug: slugField,
});

export type AdminBlogTagInput = z.infer<typeof adminBlogTagSchema>;

export const blogGenerateFromScratchSchema = z.object({
  topic: z.string().min(1).max(500),
  audience: z.string().max(500).optional(),
  tone: z.string().max(120).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  categoryHint: z.string().max(120).optional(),
  cta: z.string().max(500).optional(),
  seoIntent: z.string().max(500).optional(),
  imageStylePrompt: z.string().max(1000).optional(),
});

export const blogGenerateFromKeywordsSchema = z.object({
  primaryKeywords: z.string().min(1).max(2000),
  secondaryKeywords: z.string().max(2000).optional(),
  audience: z.string().max(500).optional(),
  tone: z.string().max(120).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  siteContext: z.string().max(2000).optional(),
  imageStyle: z.string().max(1000).optional(),
});

export const blogGenerateRewriteSchema = z.object({
  contentHtml: z.string().min(1).max(500000),
  goal: z.enum([
    'seo',
    'simplify',
    'warmer',
    'professional',
    'shorter',
    'expand',
  ]),
  extraInstructions: z.string().max(2000).optional(),
});

const blogGenerateImageFields = {
  /** Legacy freeform; optional if other context is provided */
  prompt: z.string().max(4000).optional(),
  /** What the image should depict (scene, subjects, metaphor) */
  contentDirection: z.string().max(2000).optional(),
  /** Medium, lighting, palette, illustration vs photo */
  imageStyle: z.string().max(1000).optional(),
  /** Plain-text excerpt of article body for grounding */
  contentSummary: z.string().max(8000).optional(),
  title: z.string().max(300).optional(),
  excerpt: z.string().max(500).optional(),
  keywords: z.array(z.string()).max(50).optional(),
};

export const blogGenerateImageSchema = z
  .object(blogGenerateImageFields)
  .superRefine((data, ctx) => {
    const has =
      (data.prompt?.trim().length ?? 0) > 0 ||
      (data.contentDirection?.trim().length ?? 0) > 0 ||
      (data.imageStyle?.trim().length ?? 0) > 0 ||
      (data.contentSummary?.trim().length ?? 0) > 0 ||
      (data.title?.trim().length ?? 0) > 0 ||
      (data.excerpt?.trim().length ?? 0) > 0 ||
      (data.keywords?.some((k) => k.trim().length > 0) ?? false);
    if (!has) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Provide at least one of: content direction, style, additional notes, title, excerpt, article summary, or keywords',
      });
    }
  });

export const blogFeatureImageStyleCustomPresetSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(120),
  text: z.string().min(1).max(4000),
});

export const blogAdminSettingsPatchSchema = z
  .object({
    featureImageStyleCustomPresets: z
      .array(blogFeatureImageStyleCustomPresetSchema)
      .max(30),
  })
  .strict();

export const blogPublishSchema = z.object({
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']),
  scheduledAt: z.coerce.date().nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
});
