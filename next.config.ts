import path from 'path';
import type { NextConfig } from 'next';

function hostFromUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Allow cover/audio asset URLs from env + common hosting patterns for `next/image`. */
function buildImageRemotePatterns(): NonNullable<
  NextConfig['images']
>['remotePatterns'] {
  const patterns: NonNullable<
    NextConfig['images']
  >['remotePatterns'] = [
    { protocol: 'http', hostname: 'localhost', pathname: '/**' },
    { protocol: 'https', hostname: '**.vercel.app', pathname: '/**' },
    { protocol: 'https', hostname: '**.r2.dev', pathname: '/**' },
  ];

  const extraHosts = [
    hostFromUrl(process.env.NEXT_PUBLIC_ASSETS_BASE_URL),
    hostFromUrl(process.env.NEXT_PUBLIC_SITE_URL),
    hostFromUrl(process.env.R2_PUBLIC_BASE_URL),
    hostFromUrl(process.env.S3_PUBLIC_BASE_URL),
    ...String(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ];

  const seen = new Set(
    patterns.map((p) => `${p.protocol}://${p.hostname}`)
  );
  for (const h of extraHosts) {
    if (!h || seen.has(`https://${h}`)) continue;
    seen.add(`https://${h}`);
    patterns.push({
      protocol: 'https',
      hostname: h,
      pathname: '/**',
    });
  }

  return patterns;
}

/** Hostnames allowed to hit the dev server from another origin (e.g. phone on LAN). See `NEXT_DEV_ALLOWED_ORIGINS`. */
function buildAllowedDevOrigins(): string[] {
  const fromEnv = String(process.env.NEXT_DEV_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const fromNextAuth = hostFromUrl(process.env.NEXTAUTH_URL);
  const fromSite = hostFromUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const merged = [...fromEnv, fromNextAuth, fromSite].filter(
    (x): x is string => Boolean(x)
  );
  return [...new Set(merged)];
}

const allowedDevOrigins = buildAllowedDevOrigins();

/** 31 days — stable cover URLs; fewer edge re-transforms (Vercel Image Optimization). */
const IMAGE_MIN_CACHE_TTL_SEC = 31 * 24 * 60 * 60;

/**
 * Fewer widths ⇒ fewer distinct `/_next/image` variants per source URL.
 * Aligned to Tailwind breakpoints and typical `sizes` on story grids / hero.
 */
const IMAGE_DEVICE_SIZES = [
  384, 640, 768, 1024, 1280, 1536, 1920,
] as const;

/**
 * Thumbnails and small fixed slots (e.g. admin spotlight list ~40px → next step 48).
 */
const IMAGE_SIZES = [48, 64, 96, 128, 256, 384] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: buildImageRemotePatterns(),
    minimumCacheTTL: IMAGE_MIN_CACHE_TTL_SEC,
    formats: ['image/webp'],
    qualities: [75],
    deviceSizes: [...IMAGE_DEVICE_SIZES],
    imageSizes: [...IMAGE_SIZES],
  },
};

export default nextConfig;
