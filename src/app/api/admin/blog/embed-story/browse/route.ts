import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

export const runtime = 'nodejs';

/**
 * Paginated story list for blog embed picker (covers + series titles). Optional `q` narrows by slug/series.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const rawPage = parseInt(url.searchParams.get('page') ?? '1', 10);
  const rawLimit = parseInt(url.searchParams.get('limit') ?? '18', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Math.min(36, Math.max(6, Number.isFinite(rawLimit) ? rawLimit : 18));
  const q = (url.searchParams.get('q') ?? '').trim();

  const where =
    q.length > 0
      ? {
          OR: [
            { slug: { contains: q, mode: 'insensitive' as const } },
            { seriesTitle: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

  const [rows, total] = await Promise.all([
    prisma.story.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        slug: true,
        seriesTitle: true,
        coverUrl: true,
      },
    }),
    prisma.story.count({ where }),
  ]);

  const stories = rows.map((s) => ({
    slug: s.slug,
    title: s.seriesTitle,
    seriesTitle: s.seriesTitle,
    coverUrl: s.coverUrl
      ? (resolvePublicAssetUrl(s.coverUrl) ?? s.coverUrl)
      : null,
  }));

  return NextResponse.json({
    ok: true,
    stories,
    page,
    pageSize: limit,
    total,
    hasMore: page * limit < total,
  });
}
