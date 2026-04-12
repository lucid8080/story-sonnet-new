import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { computeEngagementTotals } from '@/lib/admin/customers/aggregates';

type ActivityRow = {
  kind: string;
  label: string;
  at: string;
  ref?: string;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;

  try {
    const engagement = await computeEngagementTotals(id);

    const [likes, saves, comments, drafts] = await Promise.all([
      prisma.storySeriesLike.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { storySlug: true, createdAt: true },
      }),
      prisma.userSavedStory.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { storySlug: true, createdAt: true },
      }),
      prisma.storySeriesComment.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { storySlug: true, createdAt: true, id: true },
      }),
      prisma.storyStudioDraft.findMany({
        where: { createdByUserId: id },
        orderBy: { updatedAt: 'desc' },
        take: 15,
        select: { id: true, title: true, slug: true, updatedAt: true },
      }),
    ]);

    const feed: ActivityRow[] = [];

    for (const l of likes) {
      feed.push({
        kind: 'like',
        label: `Liked story ${l.storySlug}`,
        at: l.createdAt.toISOString(),
        ref: l.storySlug,
      });
    }
    for (const s of saves) {
      feed.push({
        kind: 'save',
        label: `Saved ${s.storySlug}`,
        at: s.createdAt.toISOString(),
        ref: s.storySlug,
      });
    }
    for (const c of comments) {
      feed.push({
        kind: 'comment',
        label: `Comment on ${c.storySlug}`,
        at: c.createdAt.toISOString(),
        ref: c.id,
      });
    }
    for (const d of drafts) {
      feed.push({
        kind: 'studio_draft',
        label: `Story Studio: ${d.title}`,
        at: d.updatedAt.toISOString(),
        ref: d.id,
      });
    }

    feed.sort((a, b) => (a.at < b.at ? 1 : -1));

    return NextResponse.json({
      ok: true,
      data: {
        counts: engagement,
        feed: feed.slice(0, 40),
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/customers/[id]/activity]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
