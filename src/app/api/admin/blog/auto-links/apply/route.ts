import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  applyAutoKeywordLinks,
  dedupeAutoLinkTargets,
  filterTargetsPresentInText,
  rankAutoLinkTargets,
  targetsFromBlogPosts,
  targetsFromExternalRules,
  targetsFromStories,
  type AppliedAutoLink,
  type AutoLinkTarget,
} from '@/lib/blog/auto-keyword-links';
import { parseExternalKeywordLinkRules } from '@/lib/blog/blog-admin-settings';
import { plainTextFromHtml } from '@/lib/blog/reading-time';
import { sanitizeBlogContentHtml } from '@/lib/blog/sanitize-html';

export const runtime = 'nodejs';

const bodySchema = z.object({
  contentHtml: z.string().max(500_000),
  currentPostSlug: z.string().max(200).optional(),
  title: z.string().max(500).optional().default(''),
  excerpt: z.string().max(5000).optional().default(''),
  tagNames: z.array(z.string().max(120)).max(40).optional().default([]),
  metaKeywords: z.string().max(2000).nullable().optional(),
  dryRun: z.boolean().optional().default(true),
  maxLinks: z.number().int().min(1).max(30).optional(),
  includeBlog: z.boolean().optional().default(true),
  includeStories: z.boolean().optional().default(true),
  includeExternal: z.boolean().optional().default(true),
});

export type AutoLinkPreviewItem = {
  phrase: string;
  href: string;
  kind: AutoLinkTarget['kind'];
  label: string;
  score: number;
};

/**
 * Preview or apply automatic internal/external keyword links in blog HTML.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json: unknown = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const [blogPosts, stories, settings] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        metaKeywords: true,
      },
    }),
    prisma.story.findMany({
      where: { isPublished: true },
      select: {
        slug: true,
        seriesTitle: true,
        summary: true,
        genre: true,
        popularityScore: true,
        isFeatured: true,
      },
    }),
    prisma.blogAdminSettings.findUnique({ where: { id: 'global' } }),
  ]);

  const externalRules = parseExternalKeywordLinkRules(
    settings?.autoKeywordLinkRulesJson ?? []
  );

  const context = {
    title: body.title,
    excerpt: body.excerpt,
    tagNames: body.tagNames,
    metaKeywords: body.metaKeywords ?? null,
    contentHtml: body.contentHtml,
  };

  const plainText = plainTextFromHtml(body.contentHtml);

  let targets: AutoLinkTarget[] = [];
  if (body.includeBlog !== false) {
    targets = targets.concat(
      targetsFromBlogPosts(blogPosts, body.currentPostSlug)
    );
  }
  if (body.includeStories !== false) {
    targets = targets.concat(targetsFromStories(stories));
  }
  if (body.includeExternal !== false) {
    targets = targets.concat(targetsFromExternalRules(externalRules));
  }

  targets = dedupeAutoLinkTargets(targets);
  targets = filterTargetsPresentInText(targets, plainText);
  targets = rankAutoLinkTargets(targets, context);

  const preview: AutoLinkPreviewItem[] = targets.slice(0, 40).map((t) => ({
    phrase: t.phrase,
    href: t.href,
    kind: t.kind,
    label: t.label,
    score: t.score,
  }));

  if (body.dryRun !== false) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      preview,
      targetCount: targets.length,
    });
  }

  const { html, applied } = applyAutoKeywordLinks(body.contentHtml, targets, {
    currentPostSlug: body.currentPostSlug,
    maxLinks: body.maxLinks,
    includeBlog: body.includeBlog,
    includeStories: body.includeStories,
    includeExternal: body.includeExternal,
  });

  const sanitized = sanitizeBlogContentHtml(html);

  return NextResponse.json({
    ok: true,
    dryRun: false,
    contentHtml: sanitized,
    applied: applied as AppliedAutoLink[],
    preview,
  });
}
