import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { requireKnownStorySlug } from '@/lib/storyEngagementApi';

const COMMENTS_TAKE = 20;

export async function GET(
  _req: Request,
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

  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const [likeCount, likedRow, savedRow, comments, ratingStats, myRatingRow] =
      await Promise.all([
      prisma.storySeriesLike.count({ where: { storySlug: decoded } }),
      userId
        ? prisma.storySeriesLike.findUnique({
            where: {
              userId_storySlug: { userId, storySlug: decoded },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      userId
        ? prisma.userSavedStory.findUnique({
            where: {
              userId_storySlug: { userId, storySlug: decoded },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.storySeriesComment.findMany({
        where: { storySlug: decoded },
        orderBy: { createdAt: 'desc' },
        take: COMMENTS_TAKE,
        select: {
          id: true,
          commentRating: true,
          body: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          user: { select: { name: true, image: true } },
        },
      }),
      prisma.storySeriesRating.aggregate({
        where: { storySlug: decoded },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      userId
        ? prisma.storySeriesRating.findUnique({
            where: {
              userId_storySlug: { userId, storySlug: decoded },
            },
            select: { rating: true },
          })
        : Promise.resolve(null),
    ]);
    return NextResponse.json({
      likeCount,
      likedByMe: !!likedRow,
      inLibrary: !!savedRow,
      ratingAverage: ratingStats._avg.rating,
      ratingCount: ratingStats._count.rating,
      myRating: myRatingRow?.rating ?? null,
      comments: comments.map((c) => ({
        id: c.id,
        authorId: c.userId,
        authorRating: c.commentRating ?? null,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        authorName: c.user.name ?? 'Listener',
        authorImage: c.user.image,
      })),
    });
  } catch (e) {
    console.error('[engagement GET]', e);
    return NextResponse.json(
      {
        error: 'Could not load engagement.',
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
