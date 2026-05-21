import { z } from 'zod';
import { STORY_SLUG_REGEX } from '@/lib/slug';

export const adminNarratorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase())
    .refine((s) => STORY_SLUG_REGEX.test(s), {
      message: 'Slug must be lowercase letters, numbers, and hyphens',
    }),
  bio: z
    .string()
    .nullable()
    .optional()
    .transform((s) => {
      if (s == null || s.trim() === '') return null;
      return s.trim();
    }),
  avatarUrl: z
    .string()
    .nullable()
    .optional()
    .transform((s) => {
      if (s == null || s.trim() === '') return null;
      return s.trim();
    }),
  sortOrder: z.number().int().optional().default(0),
});

export type AdminNarratorInput = z.infer<typeof adminNarratorSchema>;

export const adminNarratorStoriesSchema = z.object({
  storyIds: z.array(z.string().regex(/^\d+$/)),
});
