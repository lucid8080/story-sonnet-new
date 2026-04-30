import { z } from 'zod';
import type {
  ArtStyleId,
  CharacterTypeId,
  FormatId,
  GenerationRequest,
  LessonId,
  NarrationStyleId,
  SettingId,
  StoryTypeId,
  StudioAgeBand,
  TagDensityId,
  TargetLengthRangeId,
  ToneId,
  VoiceEnergyId,
} from '@/lib/story-studio/types';

export const customStoryPackageSchema = z.enum(['basic', 'plus', 'premium', 'deluxe']);

export const customStoryStudioSetupSchema = z.object({
  artStyle: z.string().min(1) as z.ZodType<ArtStyleId>,
  customArtStyle: z.string().trim().max(600).default(''),
  storyType: z.string().min(1) as z.ZodType<StoryTypeId>,
  format: z.string().min(1) as z.ZodType<FormatId>,
  targetLengthRange: z.string().min(1) as z.ZodType<TargetLengthRangeId>,
  studioAgeBand: z.string().min(1) as z.ZodType<StudioAgeBand>,
  tone: z.string().min(1) as z.ZodType<ToneId>,
  lesson: z.string().min(1) as z.ZodType<LessonId>,
  characterType: z.string().min(1) as z.ZodType<CharacterTypeId>,
  setting: z.string().min(1) as z.ZodType<SettingId>,
  narrationStyle: z.string().min(1) as z.ZodType<NarrationStyleId>,
  voiceEnergy: z.string().min(1) as z.ZodType<VoiceEnergyId>,
  tagDensity: z.string().min(1) as z.ZodType<TagDensityId>,
});

export const defaultCustomStoryStudioSetup: z.infer<typeof customStoryStudioSetupSchema> = {
  artStyle: 'whimsical-storybook',
  customArtStyle: '',
  storyType: 'adventure',
  format: 'standalone',
  targetLengthRange: '4-5',
  studioAgeBand: '5-7',
  tone: 'cozy',
  lesson: 'kindness',
  characterType: 'child',
  setting: 'forest',
  narrationStyle: 'warm',
  voiceEnergy: 'calm',
  tagDensity: 'medium',
};

export const createCustomStoryOrderSchema = z.object({
  packageType: customStoryPackageSchema,
  episodeCount: z.number().int().min(1).max(10).optional(),
  nfcRequested: z.boolean().optional().default(false),
  title: z.string().trim().min(1).max(200).optional().default(''),
  storySlug: z.string().trim().min(1).max(200).optional().default(''),
  simpleIdea: z.string().trim().min(1).max(8000),
  studioSetup: customStoryStudioSetupSchema.optional().default(defaultCustomStoryStudioSetup),
});

export const createCustomStoryPrepurchaseOrderSchema = z.object({
  packageType: customStoryPackageSchema,
  episodeCount: z.number().int().min(1).max(10).optional(),
  nfcRequested: z.boolean().optional().default(false),
});

export const customStoryCheckoutSchema = z.object({
  orderId: z.string().cuid(),
  returnUrlSuccess: z.string().url().optional(),
  returnUrlCancel: z.string().url().optional(),
});

export const customStoryGenerateSchema = z.object({
  orderId: z.string().cuid(),
});

export const customStoryNfcRequestSchema = z.object({
  requested: z.boolean().optional().default(true),
});

export const customStoryFinalizeIdeaSchema = z.object({
  simpleIdea: z.string().trim().min(1).max(8000),
  nfcRequested: z.boolean().optional(),
});

export type CustomStoryInputs = z.infer<typeof createCustomStoryOrderSchema>;
export type CreateCustomStoryOrderInput = z.infer<typeof createCustomStoryOrderSchema>;

export function orderInputToGenerationPatch(input: CreateCustomStoryOrderInput): Partial<GenerationRequest> {
  return {
    mode: 'quick',
    simpleIdea: input.simpleIdea,
    artStyle: input.studioSetup.artStyle,
    customArtStyle: input.studioSetup.customArtStyle,
    storyType: input.studioSetup.storyType,
    format: input.studioSetup.format,
    targetLengthRange: input.studioSetup.targetLengthRange,
    studioAgeBand: input.studioSetup.studioAgeBand,
    tone: input.studioSetup.tone,
    lesson: input.studioSetup.lesson,
    characterType: input.studioSetup.characterType,
    setting: input.studioSetup.setting,
    narrationStyle: input.studioSetup.narrationStyle,
    voiceEnergy: input.studioSetup.voiceEnergy,
    tagDensity: input.studioSetup.tagDensity,
  };
}
