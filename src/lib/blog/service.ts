import type { BlogPostStatus, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { slugifyBlogTitle, normalizeBlogSlug } from '@/lib/blog/slug';
import { sanitizeBlogContentHtml } from '@/lib/blog/sanitize-html';
import { estimateReadingTimeMinutesFromHtml } from '@/lib/blog/reading-time';
import { normalizeKeywordPhrase } from '@/lib/blog/keyword-normalize';
import { syncKeywordAfterPostSave } from '@/lib/blog/keyword-sync';
import type { AdminBlogPostUpsertInput } from '@/lib/validation/blogSchemas';

const includeDefault = {
  category: true,
  tags: { include: { tag: true } },
  linkedKeyword: true,
} satisfies Prisma.BlogPostInclude;

export type BlogPostAdmin = Prisma.BlogPostGetPayload<{
  include: typeof includeDefault;
}>;

async function ensureTagSlugs(
  tagIds: string[]
): Promise<{ id: string; slug: string; name: string }[]> {
  if (tagIds.length === 0) return [];
  return prisma.blogTag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true, slug: true, name: true },
  });
}

export async function createEmptyDraftPost(authorId?: string | null) {
  let slug = '';
  for (let i = 0; i < 12; i++) {
    const base =
      i === 0
        ? `draft-${Date.now().toString(36)}`
        : `draft-${Date.now().toString(36)}-${i}`;
    slug = normalizeBlogSlug(slugifyBlogTitle(base));
    const exists = await prisma.blogPost.findUnique({ where: { slug } });
    if (!exists) break;
  }
  return prisma.blogPost.create({
    data: {
      title: 'Untitled draft',
      slug,
      contentHtml: '<p></p>',
      status: 'DRAFT',
      authorId: authorId ?? undefined,
    },
    include: includeDefault,
  });
}

function revalidateBlogPublicCaches(slugs: (string | null | undefined)[]) {
  revalidatePath('/blog');
  for (const s of new Set(slugs.filter(Boolean) as string[])) {
    revalidatePath(`/blog/${s}`);
  }
}

export async function updateBlogPostFromAdmin(
  id: string,
  input: AdminBlogPostUpsertInput
): Promise<BlogPostAdmin> {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { slug: true },
  });

  const contentHtml = sanitizeBlogContentHtml(input.contentHtml ?? '');
  const readingTimeMinutes = estimateReadingTimeMinutesFromHtml(contentHtml);

  const tagRows = input.tagIds?.length
    ? await ensureTagSlugs(input.tagIds)
    : [];
  if (input.tagIds?.length && tagRows.length !== input.tagIds.length) {
    throw new Error('One or more tags were not found');
  }

  const data: Prisma.BlogPostUpdateInput = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt ?? null,
    contentHtml,
    status: input.status,
    featuredImageUrl: input.featuredImageUrl ?? null,
    featuredImageStorageKey: input.featuredImageStorageKey ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    canonicalUrl: input.canonicalUrl?.trim() ? input.canonicalUrl : null,
    authorName: input.authorName ?? null,
    publishedAt: input.publishedAt,
    scheduledAt: input.scheduledAt ?? null,
    isFeatured: input.isFeatured ?? false,
    allowComments: input.allowComments ?? false,
    readingTimeMinutes,
    metaKeywords: input.metaKeywords ?? null,
    aiPrompt: input.aiPrompt ?? null,
    aiKeywords: input.aiKeywords ?? undefined,
    generationSource: input.generationSource ?? undefined,
    author: input.authorId
      ? { connect: { id: input.authorId } }
      : { disconnect: true },
    category: input.categoryId
      ? { connect: { id: input.categoryId } }
      : { disconnect: true },
    tags: {
      deleteMany: {},
      create: tagRows.map((t) => ({
        tag: { connect: { id: t.id } },
      })),
    },
  };

  const post = await prisma.blogPost.update({
    where: { id },
    data,
    include: includeDefault,
  });

  await syncKeywordAfterPostSave(id);
  revalidateBlogPublicCaches([existing?.slug, post.slug]);
  return post;
}

export async function duplicateBlogPost(id: string): Promise<BlogPostAdmin> {
  const src = await prisma.blogPost.findUnique({
    where: { id },
    include: { tags: true },
  });
  if (!src) throw new Error('Post not found');

  const newSlug = normalizeBlogSlug(
    slugifyBlogTitle(`${src.title} copy ${Date.now().toString(36)}`)
  );

  const dup = await prisma.blogPost.create({
    data: {
      title: `${src.title} (copy)`,
      slug: newSlug,
      excerpt: src.excerpt,
      contentHtml: src.contentHtml,
      status: 'DRAFT' as BlogPostStatus,
      featuredImageUrl: src.featuredImageUrl,
      featuredImageStorageKey: src.featuredImageStorageKey,
      seoTitle: src.seoTitle,
      seoDescription: src.seoDescription,
      canonicalUrl: null,
      authorName: src.authorName,
      authorId: src.authorId,
      publishedAt: null,
      scheduledAt: null,
      isFeatured: false,
      allowComments: src.allowComments,
      readingTimeMinutes: src.readingTimeMinutes,
      metaKeywords: src.metaKeywords,
      aiPrompt: src.aiPrompt,
      aiKeywords: src.aiKeywords ?? undefined,
      generationSource: src.generationSource,
      categoryId: src.categoryId,
      tags: {
        create: src.tags.map((pt) => ({
          tag: { connect: { id: pt.tagId } },
        })),
      },
    },
    include: includeDefault,
  });
  return dup;
}

export async function setPostPublished(id: string) {
  const now = new Date();
  await prisma.blogPost.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: now,
      scheduledAt: null,
    },
  });
  await syncKeywordAfterPostSave(id);
}

export async function setPostScheduled(id: string, scheduledAt: Date) {
  await prisma.blogPost.update({
    where: { id },
    data: {
      status: 'SCHEDULED',
      scheduledAt,
      publishedAt: null,
    },
  });
  await syncKeywordAfterPostSave(id);
}

export async function setPostUnpublished(id: string, mode: 'draft' | 'archived') {
  await prisma.blogPost.update({
    where: { id },
    data: {
      status: mode === 'archived' ? 'ARCHIVED' : 'DRAFT',
      publishedAt: null,
      scheduledAt: null,
    },
  });
  await syncKeywordAfterPostSave(id);
}

export async function createKeywordRow(
  raw: string,
  extra?: Omit<
    Prisma.BlogKeywordCreateInput,
    'keyword' | 'normalizedKeyword'
  > | null
) {
  const keyword = raw.trim();
  const normalizedKeyword = normalizeKeywordPhrase(keyword);
  if (!normalizedKeyword) throw new Error('Keyword is empty');

  return prisma.blogKeyword.create({
    data: {
      keyword,
      normalizedKeyword,
      ...(extra ?? {}),
    },
  });
}
