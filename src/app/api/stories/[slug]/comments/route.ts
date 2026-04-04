import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  parseCommentBody,
  requireKnownStorySlug,
} from '@/lib/storyEngagementApi';

const DEFAULT_TAKE = 20;
const MAX_TAKE = 50;

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database not configured.', debug: 'DATABASE_URL missing' },
      { status: 503 }
    );
  }

  const { slug } = await context.params;
  const decoded = decodeURIComponent(slug);
  const known = await requireKnownStorySlug(decoded);
  if (!known.ok) {
    return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const takeRaw = searchParams.get('take');
  const skipRaw = searchParams.get('skip');
  let take = DEFAULT_TAKE;
  if (takeRaw) {
    const n = Number(takeRaw);
    if (Number.isFinite(n) && n > 0) take = Math.min(Math.floor(n), MAX_TAKE);
  }
  let skip = 0;
  if (skipRaw) {
    const n = Number(skipRaw);
    if (Number.isFinite(n) && n > 0) skip = Math.floor(n);
  }

  try {
    const comments = await prisma.storySeriesComment.findMany({
      where: { storySlug: decoded },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      skip,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
      },
    });

    const hasMore = comments.length > take;
    const list = hasMore ? comments.slice(0, take) : comments;

    return NextResponse.json({
      comments: list.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        authorName: c.user.name ?? 'Listener',
        authorImage: c.user.image,
      })),
      nextSkip: hasMore ? skip + take : null,
    });
  } catch (e) {
    console.error('[comments GET]', e);
    return NextResponse.json(
      {
        error: 'Could not load comments.',
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database not configured.', debug: 'DATABASE_URL missing' },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { slug } = await context.params;
  const decoded = decodeURIComponent(slug);
  const known = await requireKnownStorySlug(decoded);
  if (!known.ok) {
    return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const bodyObj =
    bodyJson && typeof bodyJson === 'object' && 'body' in bodyJson
      ? (bodyJson as { body: unknown }).body
      : bodyJson;

  const parsed = parseCommentBody(
    typeof bodyObj === 'string' ? bodyObj : undefined
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const row = await prisma.storySeriesComment.create({
      data: {
        userId: session.user.id,
        storySlug: decoded,
        body: parsed.body,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
      },
    });

    return NextResponse.json({
      comment: {
        id: row.id,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        authorName: row.user.name ?? 'Listener',
        authorImage: row.user.image,
      },
    });
  } catch (e) {
    console.error('[comments POST]', e);
    return NextResponse.json(
      {
        error: 'Could not post comment.',
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
