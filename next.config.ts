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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
};

export default nextConfig;
