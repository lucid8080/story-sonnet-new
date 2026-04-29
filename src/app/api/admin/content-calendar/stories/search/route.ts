import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { stories as staticStories } from '@/data.js';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

export const runtime = 'nodejs';

type StaticRow = (typeof staticStories)[number];

function staticMatchesQuery(s: StaticRow, needle: string): boolean {
  const n = needle.toLowerCase();
  return (
    s.slug.toLowerCase().includes(n) ||
    (typeof s.seriesTitle === 'string' &&
      s.seriesTitle.toLowerCase().includes(n))
  );
}

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, stories: [] });
  }

  const dbStories = await prisma.story.findMany({
    where: {
      OR: [
        { slug: { contains: q, mode: 'insensitive' } },
        { seriesTitle: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 30,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      seriesTitle: true,
      coverUrl: true,
      isPublished: true,
    },
  });

  const dbSlugs = new Set(dbStories.map((s) => s.slug));
  const merged: Array<{
    id: string | null;
    slug: string;
    title: string;
    seriesTitle: string;
    coverUrl: string | null;
    isPublished: boolean;
    catalogOnly: boolean;
  }> = dbStories.map((s) => ({
    id: s.id.toString(),
    slug: s.slug,
    title: s.seriesTitle,
    seriesTitle: s.seriesTitle,
    coverUrl: s.coverUrl,
    isPublished: s.isPublished,
    catalogOnly: false,
  }));

  for (const s of staticStories) {
    if (merged.length >= 30) break;
    if (dbSlugs.has(s.slug)) continue;
    if (!staticMatchesQuery(s, q)) continue;
    const cover = 'cover' in s && typeof s.cover === 'string' ? s.cover : null;
    merged.push({
      id: null,
      slug: s.slug,
      title: s.title,
      seriesTitle: s.seriesTitle,
      coverUrl: resolvePublicAssetUrl(cover) ?? cover,
      isPublished: true,
      catalogOnly: true,
    });
  }

  return NextResponse.json({
    ok: true,
    stories: merged,
  });
}
