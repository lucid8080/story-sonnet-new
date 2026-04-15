export const PRESET_FIELD_TOGGLE_KEYS = [
  'studioAgeBand',
  'storyType',
  'format',
  'targetLengthRange',
  'episodeCount',
  'tone',
  'lesson',
  'characterType',
  'setting',
  'narrationStyle',
  'voiceEnergy',
  'tagDensity',
  'artStyle',
  'flavor',
  'coverArtDirection',
  'musicDirection',
  'genreHint',
  'moodHint',
] as const;

export type PresetFieldToggleKey = (typeof PRESET_FIELD_TOGGLE_KEYS)[number];

export type PresetFieldEnabledMap = Partial<Record<PresetFieldToggleKey, boolean>>;

export function defaultPresetFieldEnabled(): PresetFieldEnabledMap {
  return PRESET_FIELD_TOGGLE_KEYS.reduce<PresetFieldEnabledMap>((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
}

export function isPresetFieldEnabled(
  enabled: PresetFieldEnabledMap | null | undefined,
  key: PresetFieldToggleKey
): boolean {
  return enabled?.[key] !== false;
}
