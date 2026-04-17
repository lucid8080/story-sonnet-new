import { z } from 'zod';

export const blogKeywordPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const blogKeywordStatusSchema = z.enum([
  'UNUSED',
  'TOPIC_CREATED',
  'DRAFT_CREATED',
  'PUBLISHED',
  'SKIPPED',
]);
export const blogKeywordSourceTypeSchema = z.enum([
  'MANUAL',
  'IMPORTED',
  'AI_SUGGESTED',
]);

export const blogKeywordSchema = z.object({
  keyword: z.string().min(1).max(500),
  searchIntent: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  priority: blogKeywordPrioritySchema.optional(),
  status: blogKeywordStatusSchema.optional(),
  sourceType: blogKeywordSourceTypeSchema.optional(),
  categoryId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  targetAudience: z.string().max(500).nullable().optional(),
  relatedQuestions: z.unknown().nullable().optional(),
  tagsJson: z.unknown().nullable().optional(),
  assignedTopicTitle: z.string().max(300).nullable().optional(),
  assignedBlogPostId: z.string().nullable().optional(),
});

export type BlogKeywordUpsertInput = z.infer<typeof blogKeywordSchema>;

export const bulkImportKeywordsSchema = z.object({
  raw: z.string().min(1).max(500000),
  categoryId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  priority: blogKeywordPrioritySchema.optional(),
});

export const generateTopicsFromKeywordSchema = z.object({
  keywordId: z.string().min(1),
});

export const generateDraftFromKeywordSchema = z.object({
  keywordId: z.string().min(1),
  generateImage: z.boolean().optional(),
});

export const updateKeywordStatusSchema = z.object({
  status: blogKeywordStatusSchema,
  notes: z.string().max(5000).nullable().optional(),
});

export const blogKeywordBulkActionSchema = z.object({
  keywordIds: z.array(z.string()).min(1).max(200),
  action: z.enum(['skip', 'reset_unused', 'delete']),
});

export const blogBulkTopicSuggestionsSchema = z.object({
  keywordIds: z.array(z.string()).min(1).max(50),
});
