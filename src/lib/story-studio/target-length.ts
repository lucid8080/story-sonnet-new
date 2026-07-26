/**
 * Story Studio target listening length tiers — single source of truth for
 * IDs, UI labels (with char hints), approx minutes, and LLM script caps.
 */

export const TARGET_LENGTH_RANGE_IDS = ['1-3', '3-5', '5-8', '8-12'] as const;

export type TargetLengthRangeId = (typeof TARGET_LENGTH_RANGE_IDS)[number];

export type TargetLengthTier = {
  id: TargetLengthRangeId;
  /** Minutes label for prompts, e.g. "3–5" */
  minutesLabel: string;
  /** Full UI chip label including char estimate */
  uiLabel: string;
  /** Midpoint minutes for catalog duration fallback */
  approxMinutes: number;
  /** Soft floor — regenerate if the model lands below this */
  llmMinChars: number;
  /** Sweet-spot character count to aim for in prompts */
  llmTargetChars: number;
  /** Hard max characters for LLM-generated episode scriptText */
  llmMaxChars: number;
  /** Suggested maxTokens for script / single-episode generation */
  maxTokens: number;
};

/** Manual edit / import / save ceiling (unchanged). */
export const STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE = 12_000;

/**
 * Absolute max across all LLM tiers — use for Zod LLM schemas that parse
 * before the request range is known, or as a safety ceiling.
 * Prefer `llmMaxScriptCharsForRange` when the range is available.
 */
export const STORY_STUDIO_LLM_MAX_SCRIPT_CHARS_PER_EPISODE = 10_000;

/** Brief / script package estimatedRuntimeMinutes upper bound. */
export const STORY_STUDIO_MAX_ESTIMATED_RUNTIME_MINUTES = 12;

export const TARGET_LENGTH_TIERS: readonly TargetLengthTier[] = [
  {
    id: '1-3',
    minutesLabel: '1–3',
    uiLabel: '1–3 min · ~1–2.5k chars',
    approxMinutes: 2,
    llmMinChars: 1_000,
    llmTargetChars: 1_800,
    llmMaxChars: 2_500,
    maxTokens: 6_000,
  },
  {
    id: '3-5',
    minutesLabel: '3–5',
    uiLabel: '3–5 min · ~2.5–4.5k chars',
    approxMinutes: 4,
    llmMinChars: 2_500,
    llmTargetChars: 3_500,
    llmMaxChars: 4_500,
    maxTokens: 10_000,
  },
  {
    id: '5-8',
    minutesLabel: '5–8',
    uiLabel: '5–8 min · ~4.5–7k chars',
    approxMinutes: 6,
    llmMinChars: 5_000,
    llmTargetChars: 6_000,
    llmMaxChars: 7_000,
    maxTokens: 14_000,
  },
  {
    id: '8-12',
    minutesLabel: '8–12',
    uiLabel: '8–12 min · ~7–10k chars',
    approxMinutes: 10,
    llmMinChars: 7_500,
    llmTargetChars: 8_500,
    llmMaxChars: 10_000,
    maxTokens: 18_000,
  },
] as const;

const TIER_BY_ID: Record<TargetLengthRangeId, TargetLengthTier> =
  Object.fromEntries(TARGET_LENGTH_TIERS.map((t) => [t.id, t])) as Record<
    TargetLengthRangeId,
    TargetLengthTier
  >;

export const DEFAULT_TARGET_LENGTH_RANGE: TargetLengthRangeId = '3-5';

/** UI options for Story Studio / Custom Stories chip rows. */
export const TARGET_LENGTH_UI_OPTIONS = TARGET_LENGTH_TIERS.map((t) => ({
  id: t.id,
  label: t.uiLabel,
}));

export function isTargetLengthRangeId(v: unknown): v is TargetLengthRangeId {
  return (
    typeof v === 'string' &&
    (TARGET_LENGTH_RANGE_IDS as readonly string[]).includes(v)
  );
}

/**
 * Map legacy stored ids (`2-3` | `3-4` | `4-5`) and numeric `targetMinutes`
 * onto current tiers. Unknown values fall back to the default tier.
 */
export function remapTargetLengthRange(raw: unknown): TargetLengthRangeId {
  if (isTargetLengthRangeId(raw)) return raw;
  if (typeof raw === 'string') {
    switch (raw) {
      case '2-3':
        return '1-3';
      case '3-4':
      case '4-5':
        return '3-5';
      default:
        break;
    }
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw <= 3) return '1-3';
    if (raw <= 5) return '3-5';
    if (raw <= 8) return '5-8';
    return '8-12';
  }
  return DEFAULT_TARGET_LENGTH_RANGE;
}

export function getTargetLengthTier(
  range: TargetLengthRangeId
): TargetLengthTier {
  return TIER_BY_ID[range] ?? TIER_BY_ID[DEFAULT_TARGET_LENGTH_RANGE];
}

export function llmMaxScriptCharsForRange(range: TargetLengthRangeId): number {
  return getTargetLengthTier(range).llmMaxChars;
}

export function llmMinScriptCharsForRange(range: TargetLengthRangeId): number {
  return getTargetLengthTier(range).llmMinChars;
}

export function llmTargetScriptCharsForRange(
  range: TargetLengthRangeId
): number {
  return getTargetLengthTier(range).llmTargetChars;
}

export function targetLengthRangeToApproxMinutes(
  range: TargetLengthRangeId
): number {
  return getTargetLengthTier(range).approxMinutes;
}

export function maxTokensForTargetLengthRange(
  range: TargetLengthRangeId
): number {
  return getTargetLengthTier(range).maxTokens;
}

export function targetLengthMinutesLabel(range: TargetLengthRangeId): string {
  return getTargetLengthTier(range).minutesLabel;
}

/**
 * Mandatory length block for LLM prompts — min + target + max, and ignore
 * stale brief runtime estimates / shorter prior episodes.
 */
export function scriptLengthGuidanceForRange(
  range: TargetLengthRangeId
): string {
  const t = getTargetLengthTier(range);
  return [
    `SCRIPT LENGTH (mandatory for each episode scriptText):`,
    `- Spoken target: about ${t.minutesLabel} minutes.`,
    `- Character count MUST be between ${t.llmMinChars} and ${t.llmMaxChars} (aim near ${t.llmTargetChars}).`,
    `- Do not stop early under ${t.llmMinChars}. Expand with scene detail, dialogue, sensory beats, and gentle pacing — stay age-safe.`,
    `- If an approved brief lists a shorter estimatedRuntimeMinutes, IGNORE it for script length; this length block wins.`,
    `- Prior shorter episodes are for continuity only — do not match their length if this target is longer.`,
  ].join('\n');
}

/** Error message when generated scriptText is outside the tier band. */
export function scriptLengthOutOfRangeMessage(
  episodeLabel: string,
  charCount: number,
  range: TargetLengthRangeId
): string | null {
  const t = getTargetLengthTier(range);
  if (charCount < t.llmMinChars) {
    return `${episodeLabel} script is too short: ${charCount} characters (need ${t.llmMinChars}–${t.llmMaxChars} for ${t.minutesLabel} min). Regenerate or expand the script.`;
  }
  if (charCount > t.llmMaxChars) {
    return `${episodeLabel} script exceeds character limit: ${charCount} characters (max ${t.llmMaxChars} for ${t.minutesLabel} min). Regenerate or shorten the script.`;
  }
  return null;
}
