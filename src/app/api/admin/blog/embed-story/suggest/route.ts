import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  suggestStoryEmbedsForPost,
  type StoryRowForSuggest,
} from '@/lib/blog/suggest-story-embeds';

export const runtime = 'nodejs';

const bodySchema = z.object({
  title: z.string().max(500).optional().default(''),
  excerpt: z.string().max(5000).optional().default(''),
  contentHtml: z.string().max(500_000).optional().default(''),
  tagNames: z.array(z.string().max(120)).max(40).optional().default([]),
  metaKeywords: z.string().max(2000).nullable().optional(),
  limit: z.number().int().min(1).max(12).optional(),
});

/**
 * Rank published stories relevant to blog post text (title, excerpt, tags, body).
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

  const rows = await prisma.story.findMany({
    where: { isPublished: true },
    select: {
      slug: true,
      seriesTitle: true,
      summary: true,
      fullDescription: true,
      seriesTagline: true,
      genre: true,
      mood: true,
      coverUrl: true,
      popularityScore: true,
      isFeatured: true,
      topics: true,
      characterTags: true,
      episodes: {
        select: {
          episodeNumber: true,
          isPublished: true,
          isFreePreview: true,
        },
      },
    },
    orderBy: [{ popularityScore: 'desc' }, { seriesTitle: 'asc' }],
  });

  const stories = rows as StoryRowForSuggest[];
  const suggestions = suggestStoryEmbedsForPost(stories, {
    title: body.title,
    excerpt: body.excerpt,
    contentHtml: body.contentHtml,
    tagNames: body.tagNames,
    metaKeywords: body.metaKeywords ?? null,
    limit: body.limit,
  });

  return NextResponse.json({ ok: true, suggestions });
}
