export type GenerationFamily = 'text' | 'image' | 'audio_narration';

export type ProviderKey = 'openrouter' | 'openai' | 'elevenlabs';

export type GenerationItemKind = 'model' | 'voice';

export type GenerationToolKey =
  | 'story_studio_generate_brief'
  | 'story_studio_generate_script'
  | 'story_studio_generate_episode'
  | 'story_studio_generate_cover'
  | 'blog_generate_text'
  | 'blog_generate_image'
  | 'story_studio_narration';

export type ToolFamilyMap = Record<GenerationToolKey, GenerationFamily>;

export type GenerationCatalogItem = {
  id: string;
  family: GenerationFamily;
  provider: ProviderKey;
  providerLabel: string;
  vendorLabel?: string;
  kind: GenerationItemKind;
  value: string;
  label: string;
  envKeyRequired?: string;
  supportsManualEntry?: boolean;
  isDefault?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
};

export type ResolvedGenerationOption = GenerationCatalogItem & {
  compositeKey: string;
  source: 'built_in' | 'custom';
};

export type GenerationOptionGroup = {
  provider: ProviderKey;
  providerLabel: string;
  items: ResolvedGenerationOption[];
};
