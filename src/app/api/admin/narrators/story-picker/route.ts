import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, stories: [] });
  }
  try {
    const rows = await prisma.story.findMany({
      orderBy: [{ sortPriority: 'desc' }, { seriesTitle: 'asc' }],
      select: {
        id: true,
        slug: true,
        seriesTitle: true,
        coverUrl: true,
        isPublished: true,
      },
    });
    const stories = rows.map((s) => ({
      id: s.id.toString(),
      slug: s.slug,
      seriesTitle: s.seriesTitle,
      cover: resolvePublicAssetUrl(s.coverUrl),
      isPublished: s.isPublished,
    }));
    return NextResponse.json({ ok: true, stories });
  } catch (e) {
    console.error('[admin/narrators/story-picker GET]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Load failed' },
      { status: 500 }
    );
  }
}
