import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  hasCommentModerationRole,
  parseCommentBody,
  requireKnownStorySlug,
} from '@/lib/storyEngagementApi';

async function getAuthorizedComment(args: {
  userId: string;
  userRole: string | null | undefined;
  slug: string;
  id: string;
}) {
  const comment = await prisma.storySeriesComment.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      storySlug: true,
      userId: true,
        commentRating: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, image: true } },
    },
  });
  if (!comment || comment.storySlug !== args.slug) {
    return { ok: false as const, status: 404, error: 'Comment not found.' };
  }
  if (
    comment.userId !== args.userId &&
    !hasCommentModerationRole(args.userRole)
  ) {
    return { ok: false as const, status: 403, error: 'Not allowed.' };
  }
  return { ok: true as const, comment };
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
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

  const { slug, id } = await context.params;
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
  const bodyRaw =
    bodyJson && typeof bodyJson === 'object' && 'body' in bodyJson
      ? (bodyJson as { body: unknown }).body
      : bodyJson;
  const parsed = parseCommentBody(bodyRaw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const authz = await getAuthorizedComment({
      userId: session.user.id,
      userRole: session.user.role,
      slug: decoded,
      id,
    });
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const row = await prisma.storySeriesComment.update({
      where: { id: authz.comment.id },
      data: { body: parsed.body },
      select: {
        id: true,
        userId: true,
        commentRating: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true, image: true } },
      },
    });

    return NextResponse.json({
      comment: {
        id: row.id,
        authorId: row.userId,
        authorRating: row.commentRating ?? null,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        authorName: row.user.name ?? 'Listener',
        authorImage: row.user.image,
      },
    });
  } catch (e) {
    console.error('[comment PATCH]', e);
    return NextResponse.json(
      {
        error: 'Could not update comment.',
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
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

  const { slug, id } = await context.params;
  const decoded = decodeURIComponent(slug);
  const known = await requireKnownStorySlug(decoded);
  if (!known.ok) {
    return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  }

  try {
    const authz = await getAuthorizedComment({
      userId: session.user.id,
      userRole: session.user.role,
      slug: decoded,
      id,
    });
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    await prisma.storySeriesComment.delete({ where: { id: authz.comment.id } });
    return NextResponse.json({ deletedId: authz.comment.id });
  } catch (e) {
    console.error('[comment DELETE]', e);
    return NextResponse.json(
      {
        error: 'Could not delete comment.',
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
