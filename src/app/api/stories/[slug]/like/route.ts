import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { requireKnownStorySlug } from '@/lib/storyEngagementApi';

export async function POST(
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
    await prisma.storySeriesLike.upsert({
      where: {
        userId_storySlug: { userId: session.user.id, storySlug: decoded },
      },
      create: { userId: session.user.id, storySlug: decoded },
      update: {},
    });
    const likeCount = await prisma.storySeriesLike.count({
      where: { storySlug: decoded },
    });
    return NextResponse.json({ likeCount, likedByMe: true });
  } catch (e) {
    console.error('[like POST]', e);
    return NextResponse.json(
      {
        error: 'Could not save like.',
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
    await prisma.storySeriesLike.deleteMany({
      where: { userId: session.user.id, storySlug: decoded },
    });
    const likeCount = await prisma.storySeriesLike.count({
      where: { storySlug: decoded },
    });
    return NextResponse.json({ likeCount, likedByMe: false });
  } catch (e) {
    console.error('[like DELETE]', e);
    return NextResponse.json(
      {
        error: 'Could not remove like.',
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
