export type CustomStoryPackageType = 'basic' | 'plus' | 'premium' | 'deluxe';

export const CUSTOM_STORY_STATUS = {
  DRAFT: 'draft',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const CUSTOM_STORY_PACKAGE_CONFIG: Record<
  CustomStoryPackageType,
  {
    label: string;
    defaultEpisodeCount: number;
    minEpisodeCount: number;
    maxEpisodeCount: number;
    basePriceCents: number;
    perEpisodeCents?: number;
    features: string[];
  }
> = {
  basic: {
    label: 'Basic',
    defaultEpisodeCount: 1,
    minEpisodeCount: 1,
    maxEpisodeCount: 1,
    basePriceCents: 699,
    features: [
      '1 episode',
      'Each episode max 5 minutes',
      'Basic cover',
      'Downloadable MP3',
      'No music',
    ],
  },
  plus: {
    label: 'Plus',
    defaultEpisodeCount: 3,
    minEpisodeCount: 3,
    maxEpisodeCount: 3,
    basePriceCents: 1499,
    features: [
      '3 episodes',
      'Each episode max 5 minutes',
      'Cover image',
      'Downloadable MP3s',
      'Intro/outro music',
    ],
  },
  premium: {
    label: 'Premium',
    defaultEpisodeCount: 5,
    minEpisodeCount: 5,
    maxEpisodeCount: 5,
    basePriceCents: 1999,
    features: [
      '5 episodes',
      'Each episode max 5 minutes',
      'Deeper customization',
      'Cover image',
      'Downloadable MP3s',
      'Music + sound effects',
    ],
  },
  deluxe: {
    label: 'Deluxe / Gift',
    defaultEpisodeCount: 7,
    minEpisodeCount: 7,
    maxEpisodeCount: 10,
    basePriceCents: 3499,
    perEpisodeCents: 350,
    features: [
      '7-10 episodes',
      'Each episode max 5 minutes',
      'Premium cover',
      'Downloadable bundle',
      'NFC-ready experience',
      'Gift message option',
    ],
  },
};

export const STORY_WORLD_OPTIONS = [
  'magical adventure',
  'bedtime calm',
  'funny',
  'superhero',
  'animals',
  'space',
  'custom',
] as const;

export const LESSON_OPTIONS = [
  'confidence',
  'bravery',
  'kindness',
  'sharing',
  'bedtime routine',
  'custom',
] as const;

export const AUDIO_STYLE_OPTIONS = [
  'calm narrator',
  'energetic narrator',
  'funny voices',
  'bedtime tone',
] as const;

export const COVER_STYLE_OPTIONS = [
  'storybook',
  'watercolor',
  'cartoon',
  'cozy',
  'cinematic',
] as const;

export const STUDIO_AGE_OPTIONS = [
  { id: 'toddler', label: 'Toddler' },
  { id: '3-5', label: '3-5' },
  { id: '5-7', label: '5-7' },
  { id: '7-9', label: '7-9' },
  { id: '9-12', label: '9-12' },
] as const;

export const STUDIO_STORY_TYPE_OPTIONS = [
  { id: 'bedtime', label: 'Bedtime' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'funny', label: 'Funny' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'friendship', label: 'Friendship' },
  { id: 'learning', label: 'Learning' },
  { id: 'fairy-tale', label: 'Fairy tale' },
  { id: 'animal-tale', label: 'Animal tale' },
  { id: 'calming', label: 'Calming' },
  { id: 'silly-chaos', label: 'Silly chaos' },
] as const;

export const STUDIO_FORMAT_OPTIONS = [
  { id: 'standalone', label: 'Standalone' },
  { id: 'mini-series', label: 'Mini series' },
  { id: 'series-episode', label: 'Series episode' },
] as const;

export const STUDIO_TARGET_LENGTH_OPTIONS = [
  { id: '2-3', label: '2-3 min' },
  { id: '3-4', label: '3-4 min' },
  { id: '4-5', label: '4-5 min' },
] as const;

export const STUDIO_TONE_OPTIONS = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'funny', label: 'Funny' },
  { id: 'whimsical', label: 'Whimsical' },
  { id: 'exciting', label: 'Exciting' },
  { id: 'soothing', label: 'Soothing' },
  { id: 'heartfelt', label: 'Heartfelt' },
  { id: 'curious', label: 'Curious' },
  { id: 'magical', label: 'Magical' },
  { id: 'gentle-suspense', label: 'Gentle suspense' },
] as const;

export const STUDIO_LESSON_OPTIONS = [
  { id: 'bravery', label: 'Bravery' },
  { id: 'kindness', label: 'Kindness' },
  { id: 'patience', label: 'Patience' },
  { id: 'sharing', label: 'Sharing' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'teamwork', label: 'Teamwork' },
  { id: 'bedtime-calm', label: 'Bedtime calm' },
  { id: 'trying-new-things', label: 'Trying new things' },
] as const;

export const STUDIO_CHARACTER_OPTIONS = [
  { id: 'child', label: 'Child' },
  { id: 'animal', label: 'Animal' },
  { id: 'robot', label: 'Robot' },
  { id: 'sea-creature', label: 'Sea creature' },
  { id: 'magical-creature', label: 'Magical creature' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'superhero', label: 'Superhero' },
  { id: 'princess', label: 'Princess' },
  { id: 'explorer', label: 'Explorer' },
] as const;

export const STUDIO_SETTING_OPTIONS = [
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'city', label: 'City' },
  { id: 'school', label: 'School' },
  { id: 'space', label: 'Space' },
  { id: 'castle', label: 'Castle' },
  { id: 'backyard', label: 'Backyard' },
  { id: 'dream-world', label: 'Dream world' },
  { id: 'undersea-kingdom', label: 'Undersea kingdom' },
] as const;

export const STUDIO_NARRATION_OPTIONS = [
  { id: 'warm', label: 'Warm narrator' },
  { id: 'playful', label: 'Playful narrator' },
  { id: 'cinematic', label: 'Cinematic narrator' },
  { id: 'sleepy-bedtime', label: 'Sleepy bedtime' },
] as const;

export const STUDIO_VOICE_ENERGY_OPTIONS = [
  { id: 'calm', label: 'Calm' },
  { id: 'expressive', label: 'Expressive' },
  { id: 'lively', label: 'Lively' },
  { id: 'dramatic', label: 'Dramatic' },
] as const;

export const STUDIO_TAG_DENSITY_OPTIONS = [
  { id: 'light', label: 'Light tags' },
  { id: 'medium', label: 'Medium' },
  { id: 'expressive', label: 'Expressive' },
] as const;

export function normalizePackageType(input: string): CustomStoryPackageType {
  const lower = input.trim().toLowerCase();
  if (lower === 'basic' || lower === 'plus' || lower === 'premium' || lower === 'deluxe') {
    return lower;
  }
  return 'basic';
}

export function resolveEpisodeCountForPackage(
  packageType: CustomStoryPackageType,
  requestedEpisodeCount?: number | null
): number {
  const config = CUSTOM_STORY_PACKAGE_CONFIG[packageType];
  if (packageType !== 'deluxe') return config.defaultEpisodeCount;
  if (!requestedEpisodeCount) return config.defaultEpisodeCount;
  return Math.min(config.maxEpisodeCount, Math.max(config.minEpisodeCount, requestedEpisodeCount));
}

export function priceCentsForPackage(
  packageType: CustomStoryPackageType,
  episodeCount: number
): number {
  const config = CUSTOM_STORY_PACKAGE_CONFIG[packageType];
  if (packageType !== 'deluxe') return config.basePriceCents;
  const extraEpisodes = Math.max(0, episodeCount - config.defaultEpisodeCount);
  return config.basePriceCents + extraEpisodes * (config.perEpisodeCents ?? 0);
}

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
