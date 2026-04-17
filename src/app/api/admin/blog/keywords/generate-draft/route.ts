import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { openRouterChatCompletion } from '@/lib/story-studio/openrouter';
import { extractJsonObject } from '@/lib/blog/ai/parse-json';
import { blogAiArticlePayloadSchema } from '@/lib/blog/ai/output-schemas';
import { buildDraftFromKeywordMessages } from '@/lib/blog/ai/prompts';
import { generateDraftFromKeywordSchema } from '@/lib/validation/blogKeywordSchemas';
import { sanitizeBlogContentHtml } from '@/lib/blog/sanitize-html';
import { estimateReadingTimeMinutesFromHtml } from '@/lib/blog/reading-time';
import { slugifyBlogTitle, normalizeBlogSlug } from '@/lib/blog/slug';
import { generateStoryCoverImage } from '@/lib/story-studio/vendors/image-generation';
import { uploadBlogFeatureImageBuffer } from '@/lib/blog/ai/upload-feature-image';
import { syncKeywordAfterPostSave } from '@/lib/blog/keyword-sync';

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = generateDraftFromKeywordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const kw = await prisma.blogKeyword.findUnique({
    where: { id: parsed.data.keywordId },
    include: { category: true },
  });
  if (!kw) {
    return NextResponse.json({ ok: false, error: 'Keyword not found' }, { status: 404 });
  }

  const extras = kw.category
    ? `Suggested category: ${kw.category.name}`
    : undefined;

  try {
    const messages = buildDraftFromKeywordMessages(kw.keyword, extras);
    const rawOut = await openRouterChatCompletion({
      messages,
      maxTokens: 12000,
      temperature: 0.78,
    });
    const extracted = extractJsonObject(rawOut);
    const article = blogAiArticlePayloadSchema.safeParse(JSON.parse(extracted));
    if (!article.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid article JSON',
          details: article.error.flatten(),
          rawPreview: rawOut.slice(0, 400),
        },
        { status: 422 }
      );
    }

    const a = article.data;
    const title = a.title;
    let slug = normalizeBlogSlug(slugifyBlogTitle(title));
    for (let i = 0; i < 10; i++) {
      const exists = await prisma.blogPost.findUnique({ where: { slug } });
      if (!exists) break;
      slug = normalizeBlogSlug(`${slug}-${i + 1}`);
    }

    const contentHtml = sanitizeBlogContentHtml(a.contentHtml);
    const readingTimeMinutes = estimateReadingTimeMinutesFromHtml(contentHtml);

    let post = kw.assignedBlogPostId
      ? await prisma.blogPost.findUnique({ where: { id: kw.assignedBlogPostId } })
      : null;

    if (post) {
      post = await prisma.blogPost.update({
        where: { id: post.id },
        data: {
          title,
          slug,
          excerpt: a.excerpt,
          contentHtml,
          seoTitle: a.seoTitle ?? null,
          seoDescription: a.seoDescription ?? null,
          readingTimeMinutes,
          generationSource: 'AI_KEYWORDS',
          aiKeywords: [kw.keyword],
          categoryId: kw.categoryId,
          status: 'DRAFT',
        },
      });
      await prisma.blogKeyword.update({
        where: { id: kw.id },
        data: {
          assignedTopicTitle: title,
          status: 'DRAFT_CREATED',
          lastGeneratedAt: new Date(),
        },
      });
    } else {
      post = await prisma.blogPost.create({
        data: {
          title,
          slug,
          excerpt: a.excerpt,
          contentHtml,
          seoTitle: a.seoTitle ?? null,
          seoDescription: a.seoDescription ?? null,
          readingTimeMinutes,
          generationSource: 'AI_KEYWORDS',
          aiKeywords: [kw.keyword],
          categoryId: kw.categoryId,
          status: 'DRAFT',
          authorId: session.user.id,
        },
      });

      await prisma.blogKeyword.update({
        where: { id: kw.id },
        data: {
          assignedBlogPostId: post.id,
          assignedTopicTitle: title,
          status: 'DRAFT_CREATED',
          lastGeneratedAt: new Date(),
        },
      });
    }

    if (!post) {
      return NextResponse.json({ ok: false, error: 'Post save failed' }, { status: 500 });
    }

    const slugList: string[] = [];
    for (const name of a.suggestedTags ?? []) {
      const ts = normalizeBlogSlug(slugifyBlogTitle(name));
      slugList.push(ts);
      await prisma.blogTag.upsert({
        where: { slug: ts },
        create: { name: name.trim(), slug: ts },
        update: { name: name.trim() },
      });
    }
    if (slugList.length > 0) {
      const tags = await prisma.blogTag.findMany({
        where: { slug: { in: slugList } },
      });
      await prisma.blogPostTag.deleteMany({ where: { postId: post.id } });
      await prisma.blogPostTag.createMany({
        data: tags.map((t) => ({ postId: post.id, tagId: t.id })),
      });
    }

    let featuredImageUrl: string | null = null;
    let featuredImageStorageKey: string | null = null;

    if (parsed.data.generateImage && a.imagePrompt) {
      const img = await generateStoryCoverImage({ prompt: a.imagePrompt });
      if (img.ok) {
        const up = await uploadBlogFeatureImageBuffer({
          blogSlug: post.slug,
          buffer: img.imageBuffer,
          mimeType: img.mimeType,
          fileNameHint: 'feature.png',
        });
        featuredImageUrl = up.fileUrl;
        featuredImageStorageKey = up.storageKey;
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { featuredImageUrl, featuredImageStorageKey },
        });
      }
    }

    await syncKeywordAfterPostSave(post.id);

    const fresh = await prisma.blogPost.findUnique({
      where: { id: post.id },
      include: {
        category: true,
        tags: { include: { tag: true } },
        linkedKeyword: true,
      },
    });

    return NextResponse.json({ ok: true, post: fresh, payload: a });
  } catch (e) {
    console.error('[generate-draft]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 422 }
    );
  }
}
