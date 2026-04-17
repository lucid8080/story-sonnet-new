import prisma from '@/lib/prisma';
import { publicBlogStatusesFilter } from '@/lib/blog/visibility';
import { BRAND } from '@/lib/brand';

const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
  process.env.NEXTAUTH_URL?.replace(/\/+$/, '') ||
  'http://localhost:3000';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const now = new Date();
  let posts: {
    title: string;
    slug: string;
    excerpt: string | null;
    updatedAt: Date;
    publishedAt: Date | null;
  }[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: publicBlogStatusesFilter(now),
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 40,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        updatedAt: true,
        publishedAt: true,
      },
    });
  } catch {
    posts = [];
  }

  const items = posts
    .map((p) => {
      const link = `${base}/blog/${p.slug}`;
      const pub = (p.publishedAt ?? p.updatedAt).toUTCString();
      const desc = escapeXml(p.excerpt?.trim() || '');
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${desc}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(BRAND.productName)} Blog</title>
    <link>${base}/blog</link>
    <description>${escapeXml(BRAND.description)}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
