import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { publicBlogStatusesFilter } from '@/lib/blog/visibility';

const postInclude = {
  category: true,
  tags: { include: { tag: true } },
} satisfies Prisma.BlogPostInclude;

export type BlogPostWithRelations = Prisma.BlogPostGetPayload<{
  include: typeof postInclude;
}>;

export async function getPublicPostBySlug(
  slug: string,
  now: Date
): Promise<BlogPostWithRelations | null> {
  const post = await prisma.blogPost.findFirst({
    where: {
      slug,
      ...publicBlogStatusesFilter(now),
    },
    include: postInclude,
  });
  return post;
}

export async function listPublicBlogPosts(params: {
  now: Date;
  take: number;
  skip?: number;
  search?: string;
  categorySlug?: string;
  tagSlug?: string;
  sort: 'newest' | 'oldest' | 'featured';
}): Promise<BlogPostWithRelations[]> {
  const { now, take, skip = 0, search, categorySlug, tagSlug, sort } = params;

  const where: Prisma.BlogPostWhereInput = {
    ...publicBlogStatusesFilter(now),
    ...(search?.trim()
      ? {
          OR: [
            { title: { contains: search.trim(), mode: 'insensitive' } },
            { excerpt: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(categorySlug
      ? { category: { slug: categorySlug } }
      : {}),
    ...(tagSlug
      ? { tags: { some: { tag: { slug: tagSlug } } } }
      : {}),
  };

  const orderBy: Prisma.BlogPostOrderByWithRelationInput[] =
    sort === 'featured'
      ? [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }]
      : sort === 'oldest'
        ? [{ publishedAt: 'asc' }, { scheduledAt: 'asc' }, { createdAt: 'asc' }]
        : [{ publishedAt: 'desc' }, { scheduledAt: 'desc' }, { createdAt: 'desc' }];

  return prisma.blogPost.findMany({
    where,
    include: postInclude,
    orderBy,
    take,
    skip,
  });
}

export async function countPublicBlogPosts(params: {
  now: Date;
  search?: string;
  categorySlug?: string;
  tagSlug?: string;
}): Promise<number> {
  const { now, search, categorySlug, tagSlug } = params;
  const where: Prisma.BlogPostWhereInput = {
    ...publicBlogStatusesFilter(now),
    ...(search?.trim()
      ? {
          OR: [
            { title: { contains: search.trim(), mode: 'insensitive' } },
            { excerpt: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(categorySlug
      ? { category: { slug: categorySlug } }
      : {}),
    ...(tagSlug
      ? { tags: { some: { tag: { slug: tagSlug } } } }
      : {}),
  };
  return prisma.blogPost.count({ where });
}

export async function getFeaturedPublicPost(
  now: Date
): Promise<BlogPostWithRelations | null> {
  const rows = await prisma.blogPost.findMany({
    where: {
      ...publicBlogStatusesFilter(now),
      isFeatured: true,
    },
    include: postInclude,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 1,
  });
  return rows[0] ?? null;
}

export async function getRelatedPublicPosts(
  postId: string,
  categoryId: string | null,
  tagIds: string[],
  now: Date,
  take = 3
): Promise<BlogPostWithRelations[]> {
  const or: Prisma.BlogPostWhereInput[] = [];
  if (categoryId) {
    or.push({ categoryId });
  }
  if (tagIds.length > 0) {
    or.push({
      tags: { some: { tagId: { in: tagIds } } },
    });
  }
  if (or.length === 0) return [];

  return prisma.blogPost.findMany({
    where: {
      id: { not: postId },
      ...publicBlogStatusesFilter(now),
      OR: or,
    },
    include: postInclude,
    orderBy: [{ publishedAt: 'desc' }],
    take,
  });
}
