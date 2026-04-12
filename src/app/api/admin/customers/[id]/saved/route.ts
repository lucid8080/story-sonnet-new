import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;

  try {
    const [saved, likes] = await Promise.all([
      prisma.userSavedStory.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { storySlug: true, createdAt: true },
      }),
      prisma.storySeriesLike.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { storySlug: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        saved: saved.map((s) => ({
          storySlug: s.storySlug,
          createdAt: s.createdAt.toISOString(),
        })),
        likes: likes.map((l) => ({
          storySlug: l.storySlug,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/customers/[id]/saved]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
