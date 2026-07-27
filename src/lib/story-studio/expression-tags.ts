/** Vendor-compatible Emotional Tone tags (ElevenLabs-style). */
export const EMOTIONAL_TONE_TAGS = [
  'angry',
  'sad',
  'embarrassed',
  'emphasis',
  'whispering',
  'soft',
  'breathy',
  'excited',
] as const;

/** Vendor-compatible Audio Effects tags. */
export const AUDIO_EFFECT_TAGS = [
  'laughing',
  'chuckling',
  'moaning',
  'clear throat',
  'sobbing',
  'crying loudly',
  'sighing',
  'panting',
  'groaning',
  'crowd laughing',
  'background laughter',
  'audience laughing',
  'pause',
  'long pause',
] as const;

export type EmotionalToneTag = (typeof EMOTIONAL_TONE_TAGS)[number];
export type AudioEffectTag = (typeof AUDIO_EFFECT_TAGS)[number];
export type AllowedExpressionTag = EmotionalToneTag | AudioEffectTag;

export const ALLOWED_EXPRESSION_TAGS: readonly AllowedExpressionTag[] = [
  ...EMOTIONAL_TONE_TAGS,
  ...AUDIO_EFFECT_TAGS,
];

const ALLOWED_SET = new Set<string>(ALLOWED_EXPRESSION_TAGS);

/**
 * Common freeform leftovers → canonical tag.
 * Keys must be lowercase trimmed inner text (no brackets).
 */
export const EXPRESSION_TAG_ALIASES: Readonly<Record<string, AllowedExpressionTag>> =
  {
    giggle: 'laughing',
    giggles: 'laughing',
    chuckle: 'chuckling',
    whisper: 'whispering',
    'dramatic pause': 'pause',
    sigh: 'sighing',
    cry: 'sobbing',
    crying: 'sobbing',
    'clearing throat': 'clear throat',
    'clears throat': 'clear throat',
  };

/** Prompt-ready closed list (Emotional Tone + Audio Effects). */
export function expressionTagsAllowlistForPrompt(): string {
  const tone = EMOTIONAL_TONE_TAGS.map((t) => `[${t}]`).join(', ');
  const effects = AUDIO_EFFECT_TAGS.map((t) => `[${t}]`).join(', ');
  return `Emotional Tone (only): ${tone}.
Audio Effects (only): ${effects}.`;
}

function cleanupAfterTagEdits(script: string): string {
  return script
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ?\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Rewrite alias tags to canonical form; strip unknown `[...]` brackets.
 * Allowed tags are lowercased/trimmed to canonical spelling.
 */
export function normalizeExpressionTags(script: string): string {
  const rewritten = script.replace(/\[[^\]]*\]/g, (match) => {
    const inner = match.slice(1, -1).trim().toLowerCase();
    if (!inner) return '';
    const aliased = EXPRESSION_TAG_ALIASES[inner];
    if (aliased) return `[${aliased}]`;
    if (ALLOWED_SET.has(inner)) return `[${inner}]`;
    return '';
  });
  return cleanupAfterTagEdits(rewritten);
}
