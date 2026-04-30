import { z } from 'zod';

export const generationFamilySchema = z.enum(['text', 'image', 'audio_narration']);
export const generationProviderSchema = z.enum(['openrouter', 'openai', 'elevenlabs']);
export const generationKindSchema = z.enum(['model', 'voice']);
export const generationToolKeySchema = z.enum([
  'story_studio_generate_brief',
  'story_studio_generate_script',
  'story_studio_generate_episode',
  'story_studio_generate_cover',
  'blog_generate_text',
  'blog_generate_image',
  'story_studio_narration',
]);

export const generationOptionCreateSchema = z.object({
  family: generationFamilySchema,
  provider: generationProviderSchema,
  kind: generationKindSchema,
  vendorLabel: z.string().trim().max(120).optional().nullable(),
  label: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(300),
  envKeyRequired: z.string().trim().max(120).optional().nullable(),
  isEnabled: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(-10000).max(10000).optional().default(0),
});

export const generationOptionUpdateSchema = z.object({
  vendorLabel: z.string().trim().max(120).optional().nullable(),
  label: z.string().trim().min(1).max(200).optional(),
  value: z.string().trim().min(1).max(300).optional(),
  envKeyRequired: z.string().trim().max(120).optional().nullable(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(-10000).max(10000).optional(),
});

export const generationPreferenceUpsertSchema = z.object({
  toolKey: generationToolKeySchema,
  selectedCompositeKey: z.string().trim().min(1).max(500),
});

export const generationSettingsPatchSchema = z
  .object({
    customStoriesGlobalEnabled: z.boolean(),
  })
  .strict();
