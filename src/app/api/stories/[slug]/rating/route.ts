import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  parseStoryRating,
  requireKnownStorySlug,
} from '@/lib/storyEngagementApi';

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

  const ratingRaw =
    bodyJson && typeof bodyJson === 'object' && 'rating' in bodyJson
      ? (bodyJson as { rating: unknown }).rating
      : bodyJson;

  const parsed = parseStoryRating(ratingRaw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await prisma.storySeriesRating.upsert({
      where: {
        userId_storySlug: { userId: session.user.id, storySlug: decoded },
      },
      create: {
        userId: session.user.id,
        storySlug: decoded,
        rating: parsed.rating,
      },
      update: {
        rating: parsed.rating,
      },
    });

    const summary = await prisma.storySeriesRating.aggregate({
      where: { storySlug: decoded },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return NextResponse.json({
      myRating: parsed.rating,
      ratingAverage: summary._avg.rating,
      ratingCount: summary._count.rating,
    });
  } catch (e) {
    console.error('[rating POST]', e);
    return NextResponse.json(
      {
        error: 'Could not save rating.',
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
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

  try {
    await prisma.storySeriesRating.deleteMany({
      where: { userId: session.user.id, storySlug: decoded },
    });

    const summary = await prisma.storySeriesRating.aggregate({
      where: { storySlug: decoded },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return NextResponse.json({
      myRating: null,
      ratingAverage: summary._avg.rating,
      ratingCount: summary._count.rating,
    });
  } catch (e) {
    console.error('[rating DELETE]', e);
    return NextResponse.json(
      {
        error: 'Could not remove rating.',
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
