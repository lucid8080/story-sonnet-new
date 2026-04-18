/** Sidecar object key for WebP display variant (site uses this URL; original stays alongside). */
export const DISPLAY_WEBP_SUFFIX = '_display.webp';

/**
 * `covers/foo/cover-abc.png` → `covers/foo/cover-abc_display.webp`
 * Idempotent if already a display key.
 */
export function displayKeyFromOriginalKey(originalKey: string): string {
  const k = originalKey.replace(/^\/+/, '').trim();
  if (!k) return `file${DISPLAY_WEBP_SUFFIX}`;
  const lower = k.toLowerCase();
  if (lower.endsWith(DISPLAY_WEBP_SUFFIX)) return k;
  const dot = k.lastIndexOf('.');
  const base = dot > 0 ? k.slice(0, dot) : k;
  return `${base}${DISPLAY_WEBP_SUFFIX}`;
}
