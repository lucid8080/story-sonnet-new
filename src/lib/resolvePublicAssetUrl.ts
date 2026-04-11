/**
 * Remap loopback URLs and path-only public paths to a public asset base (CDN / R2),
 * so DB-stored http://localhost:3000/... works when assets live on R2 or another host.
 *
 * Resolution order: NEXT_PUBLIC_ASSETS_BASE_URL, then R2_PUBLIC_BASE_URL, then S3_PUBLIC_BASE_URL
 * (matches uploadPublicObject in s3.ts when Story Studio stores cover URLs).
 */
function getPublicAssetsBase(): string {
  if (typeof process === 'undefined') return '';
  const raw =
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL?.trim() ||
    process.env.R2_PUBLIC_BASE_URL?.trim() ||
    process.env.S3_PUBLIC_BASE_URL?.trim() ||
    '';
  return raw.replace(/\/+$/, '');
}

export function resolvePublicAssetUrl(
  url: string | null | undefined
): string | null {
  if (url == null || url.trim() === '') return null;
  const raw = url.trim();
  const baseRaw = getPublicAssetsBase();
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
