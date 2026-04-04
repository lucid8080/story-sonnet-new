import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import { stories as staticStories } from '../data.js';

/**
 * Canonical public MP3 path from `src/data.js` for a catalog story episode.
 * Used when DB rows omit or mis-set `audioUrl` but the story still exists in the static catalog.
 */
export function getCatalogEpisodeAudioSrc(
  storySlug: string,
  episodeNumber: number
): string | null {
  const s = staticStories.find((x) => x.slug === storySlug);
  if (!s?.episodes?.length) return null;
  const found = s.episodes.find((se, idx) => {
    const num = typeof se.id === 'number' ? se.id : idx + 1;
    return num === episodeNumber;
  });
  const src = found?.audioSrc;
  return src && src.trim() ? src.trim() : null;
}

/**
 * Same as {@link getCatalogEpisodeAudioSrc} but applies `resolvePublicAssetUrl` using **current**
 * server env so `/audio/...` from `data.js` (e.g. baked when `NEXT_PUBLIC_ASSETS_BASE_URL` was empty)
 * still becomes a full CDN URL at request time.
 */
export function getResolvedCatalogEpisodeAudioSrc(
  storySlug: string,
  episodeNumber: number
): string | null {
  const raw = getCatalogEpisodeAudioSrc(storySlug, episodeNumber);
  if (!raw) return null;
  return resolvePublicAssetUrl(raw) ?? raw;
}
