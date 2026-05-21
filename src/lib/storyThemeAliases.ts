import type { AppStory } from '@/lib/stories';

export function extractAudioSlugFromPathLike(
  input: string | null | undefined
): string | null {
  const v = input?.trim();
  if (!v) return null;
  try {
    const p = new URL(v).pathname;
    const m = p.match(/^\/audio\/([^/]+)\//i);
    return m?.[1] ?? null;
  } catch {
    const normalized = v.split('?')[0]?.split('#')[0] ?? '';
    const m = normalized.match(/^\/?audio\/([^/]+)\//i);
    return m?.[1] ?? null;
  }
}

export function collectThemeSlugAliases(
  storySlug: string,
  story: Pick<AppStory, 'episodes'>
): string[] {
  const aliases = new Set<string>();
  for (const ep of story.episodes) {
    const fromKey = extractAudioSlugFromPathLike(ep.audioStorageKey ?? null);
    const fromUrl = extractAudioSlugFromPathLike(ep.audioSrc ?? null);
    for (const candidate of [fromKey, fromUrl]) {
      if (candidate && candidate !== storySlug) aliases.add(candidate);
    }
  }
  return Array.from(aliases);
}
