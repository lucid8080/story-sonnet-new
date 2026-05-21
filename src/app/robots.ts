import type { MetadataRoute } from 'next';

const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
  process.env.NEXTAUTH_URL?.replace(/\/+$/, '') ||
  'http://localhost:3000';

/**
 * Set `SITE_CRAWLABLE=false` on Vercel before launch to discourage bots
 * (saves Fluid CPU from crawlers hitting dynamic routes).
 */
export default function robots(): MetadataRoute.Robots {
  const crawlable = process.env.SITE_CRAWLABLE !== 'false';

  if (!crawlable) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      sitemap: `${base}/sitemap.xml`,
    };
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
  };
}
