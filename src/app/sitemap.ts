import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { publicBlogStatusesFilter } from '@/lib/blog/visibility';

const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
  process.env.NEXTAUTH_URL?.replace(/\/+$/, '') ||
  'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let posts: { slug: string; updatedAt: Date }[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: publicBlogStatusesFilter(now),
      select: { slug: true, updatedAt: true },
    });
  } catch {
    posts = [];
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    {
      url: `${base}/library`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${base}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${base}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...blogRoutes];
}
