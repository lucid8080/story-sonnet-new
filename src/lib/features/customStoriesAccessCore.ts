export const CUSTOM_STORIES_FEATURE_TAG = 'feature:custom-stories';

export function normalizeFeatureTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim().toLowerCase();
    if (!normalized) continue;
    seen.add(normalized);
  }
  return Array.from(seen);
}

export function hasCustomStoriesAccess(input: {
  role?: string | null;
  internalTags?: unknown;
  customStoriesGlobalEnabled?: boolean | null;
}): boolean {
  if ((input.role ?? '').toLowerCase() === 'admin') return true;
  const tags = normalizeFeatureTags(input.internalTags);
  if (tags.includes(CUSTOM_STORIES_FEATURE_TAG)) return true;
  return Boolean(input.customStoriesGlobalEnabled);
}
