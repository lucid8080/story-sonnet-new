import type { TagDensityId } from '@/lib/story-studio/types';

/** Shared UI options for Story Studio / Custom Stories / Add Episode. */
export const TAG_DENSITY_UI_OPTIONS = [
  { id: 'none', label: 'Off (no emotion tags)' },
  { id: 'light', label: 'Light tags' },
  { id: 'medium', label: 'Medium' },
  { id: 'expressive', label: 'Expressive' },
] as const satisfies ReadonlyArray<{ id: TagDensityId; label: string }>;

/**
 * Remove square-bracket performance / cue tags like `[whispering]`.
 * Used when tag density is `none` so output stays plain narration.
 */
export function stripExpressionBracketTags(script: string): string {
  return script
    .replace(/\[[^\]]*]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ?\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isTagDensityId(v: unknown): v is TagDensityId {
  return (
    v === 'none' || v === 'light' || v === 'medium' || v === 'expressive'
  );
}
