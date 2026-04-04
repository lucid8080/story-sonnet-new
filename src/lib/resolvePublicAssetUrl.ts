/**
 * Remap loopback URLs and path-only public paths to NEXT_PUBLIC_ASSETS_BASE_URL (e.g. R2),
 * so DB-stored http://localhost:3000/... works when the dev server uses another port or assets are on CDN.
 */
export function resolvePublicAssetUrl(
  url: string | null | undefined
): string | null {
  if (url == null || url.trim() === '') return null;
  const raw = url.trim();
  const baseRaw =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ASSETS_BASE_URL
      ? process.env.NEXT_PUBLIC_ASSETS_BASE_URL.trim().replace(/\/+$/, '')
      : '';
  if (!baseRaw) return raw;
  try {
    const u = new URL(raw);
    const loopback =
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '[::1]';
    if (!loopback) return raw;
    const baseUrl = new URL(
      baseRaw.includes('://') ? baseRaw : `https://${baseRaw}`
    );
    if (u.origin === baseUrl.origin) return raw;
    return `${baseRaw.replace(/\/+$/, '')}${u.pathname}${u.search}`;
  } catch {
    if (raw.startsWith('/')) {
      return `${baseRaw.replace(/\/+$/, '')}${raw}`;
    }
    return raw;
  }
}
