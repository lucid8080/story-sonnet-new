import type { AgeRangeId, GenreId, MoodId } from '@/constants/storyFilters';
import type { ArtStyleId } from '@/lib/story-studio/art-style-options';
import type { PresetFieldEnabledMap } from '@/lib/story-studio/preset-field-toggles';

export type { ArtStyleId } from '@/lib/story-studio/art-style-options';

export type StoryStudioMode = 'quick' | 'prompt';

export type StudioAgeBand =
  | 'toddler'
  | '3-5'
  | '5-7'
  | '7-9'
  | '9-12';

export type StoryTypeId =
  | 'bedtime'
  | 'adventure'
  | 'funny'
  | 'mystery'
  | 'friendship'
  | 'learning'
  | 'fairy-tale'
  | 'animal-tale'
  | 'calming'
  | 'silly-chaos';

export type FormatId = 'standalone' | 'mini-series' | 'series-episode';

export type ToneId =
  | 'cozy'
  | 'funny'
  | 'whimsical'
  | 'exciting'
  | 'soothing'
  | 'heartfelt'
  | 'curious'
  | 'magical'
  | 'gentle-suspense';

export type LessonId =
  | 'bravery'
  | 'kindness'
  | 'patience'
  | 'sharing'
  | 'confidence'
  | 'teamwork'
  | 'bedtime-calm'
  | 'trying-new-things';

export type CharacterTypeId =
  | 'child'
  | 'animal'
  | 'robot'
  | 'sea-creature'
  | 'magical-creature'
  | 'vehicle'
  | 'superhero'
  | 'princess'
  | 'explorer';

export type SettingId =
  | 'ocean'
  | 'forest'
  | 'city'
  | 'school'
  | 'space'
  | 'castle'
  | 'backyard'
  | 'dream-world'
  | 'undersea-kingdom';

export type NarrationStyleId =
  | 'warm'
  | 'playful'
  | 'cinematic'
  | 'sleepy-bedtime';

export type VoiceEnergyId = 'calm' | 'expressive' | 'lively' | 'dramatic';

export type TagDensityId = 'light' | 'medium' | 'expressive';

/** Story Studio target listening length (minutes); max option is 4–5 min. */
export type TargetLengthRangeId = '2-3' | '3-4' | '4-5';

export type GenerationJobStep =
  | 'brief'
  | 'script'
  | 'cover'
  | 'theme_full'
  | 'theme_intro'
  | 'tts'
  | 'package';

export type GeneratedAssetKind =
  | 'cover'
  | 'theme_full'
  | 'theme_intro'
  | 'episode_audio'
  | 'other';

/** Normalized request stored on StoryStudioDraft.request */
export type GenerationRequest = {
  mode: StoryStudioMode;
  studioAgeBand: StudioAgeBand;
  storyType: StoryTypeId;
  format: FormatId;
  targetLengthRange: TargetLengthRangeId;
  episodeCount: number;
  tone: ToneId;
  lesson: LessonId;
  characterType: CharacterTypeId;
  setting: SettingId;
  narrationStyle: NarrationStyleId;
  voiceEnergy: VoiceEnergyId;
  tagDensity: TagDensityId;
  /** Quick Build / Prompt Mode illustration style for cover + brief alignment */
  artStyle: ArtStyleId;
  /** Free-text art direction (combined with preset chip); empty if unused */
  customArtStyle: string;
  simpleIdea: string;
  customPrompt: string;
  includeIntroMusic: boolean;
  generateCover: boolean;
  generateAudio: boolean;
  generateTheme: boolean;
  autoPublish: boolean;
  /** Optional ElevenLabs override */
  elevenLabsVoiceId?: string;
  /** Mapped catalog fields for Story row after generation */
  catalogAgeRange: AgeRangeId;
  catalogGenre: GenreId | null;
  catalogMood: MoodId | null;
  /** From preset */
  flavor?: string;
  coverArtDirection?: string;
  /** Full image API prompt override for Cover Art; used when non-empty after trim. */
  coverImagePromptDraft?: string;
  /** Selected generated asset id used as primary cover when pushing/syncing. */
  mainCoverAssetId?: string;
  musicDirection?: string;
  /** Optional catalog overrides from preset (must match filter ids) */
  genreHint?: string;
  moodHint?: string;
  /** Per-category preset influence toggles; false means exclude from generation context. */
  presetFieldEnabled?: PresetFieldEnabledMap;
};

export type BriefPayload = {
  title: string;
  seriesTitle: string;
  summary: string;
  logline: string;
  characters: string[];
  settingSketch: string;
  suggestedGenre: GenreId | null;
  suggestedMood: MoodId | null;
  ageRange: AgeRangeId;
  episodeOutline: { title: string; beat: string }[];
  coverArtPrompt: string;
  musicPrompt: string;
  estimatedRuntimeMinutes: number;
  safetyNotes: string;
};

export type ScriptEpisodePayload = {
  title: string;
  summary: string;
  scriptText: string;
  hookEnding?: string;
};

export type ScriptPackagePayload = {
  title: string;
  seriesTitle: string;
  summary: string;
  fullScript?: string;
  episodes: ScriptEpisodePayload[];
  coverArtPrompt: string;
  musicPrompt: string;
  narrationNotes: string;
  estimatedRuntimeMinutes: number;
  ageRange: AgeRangeId;
  tags: string[];
  expressionTagDensity: TagDensityId;
};
