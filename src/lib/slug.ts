/** Same rule as story admin (`adminStoryUpsertSchema`); keep in sync with upload key segments. */
export const STORY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeStorySlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidStorySlug(s: string): boolean {
  return STORY_SLUG_REGEX.test(s);
}
