import { z } from 'zod';

/** JSON-only LLM output for full article generation */
export const blogAiArticlePayloadSchema = z.object({
  titleSuggestions: z.array(z.string()).max(15).optional(),
  title: z.string().min(1),
  excerpt: z.string().min(1).max(2000),
  contentHtml: z.string().min(1),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(320).optional(),
  suggestedTags: z.array(z.string()).max(30).optional(),
  suggestedCategoryName: z.string().max(120).optional(),
  imagePrompt: z.string().max(4000).optional(),
  faqHtml: z.string().optional(),
});

export type BlogAiArticlePayload = z.infer<typeof blogAiArticlePayloadSchema>;

export const blogAiTopicIdeasPayloadSchema = z.object({
  topics: z
    .array(
      z.object({
        title: z.string(),
        angle: z.string().optional(),
        searchIntent: z.string().optional(),
        audienceFit: z.string().optional(),
        recommendedCategory: z.string().optional(),
        seoDirection: z.string().optional(),
      })
    )
    .min(1)
    .max(15),
});

export const blogAiSingleTopicPayloadSchema = z.object({
  title: z.string(),
  angle: z.string().optional(),
  searchIntent: z.string().optional(),
  audienceFit: z.string().optional(),
  recommendedCategory: z.string().optional(),
  seoDirection: z.string().optional(),
});

export const blogAiRewritePayloadSchema = z.object({
  title: z.string().optional(),
  excerpt: z.string().optional(),
  contentHtml: z.string().min(1),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(320).optional(),
});
