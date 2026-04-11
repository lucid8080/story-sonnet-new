/** Fallback when a title slugifies to nothing (matches draft create default). */
export const STORY_STUDIO_DRAFT_SLUG_SEED = 'untitled-draft';

/**
 * Derive a URL-safe draft slug from a display title (Story Studio + upload key prefix).
 * Keep in sync with admin PATCH slug rules: lowercase letters, numbers, hyphens.
 */
export function draftSlugFromTitle(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return s || STORY_STUDIO_DRAFT_SLUG_SEED;
}
