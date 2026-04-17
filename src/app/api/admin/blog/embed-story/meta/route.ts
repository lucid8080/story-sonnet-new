import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchStoryBySlug } from '@/lib/stories';

export const runtime = 'nodejs';

/**
 * Story metadata for blog embed picker (admin): episodes, cover, title.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const slug = new URL(req.url).searchParams.get('slug')?.trim() ?? '';
  if (!slug) {
    return NextResponse.json(
      { ok: false, error: 'Missing slug' },
      { status: 400 }
    );
  }

  const story = await fetchStoryBySlug(slug, { visibility: 'all' });
  if (!story) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const published = story.episodes
    .filter((e) => e.isPublished)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  const firstPreviewEp = published.find((e) => e.isFreePreview) ?? published[0];
  const firstFullEp = published[0] ?? null;

  return NextResponse.json({
    ok: true,
    story: {
      slug: story.slug,
      title: story.title,
      coverUrl: story.cover ?? null,
      episodes: story.episodes
        .slice()
        .sort((a, b) => a.episodeNumber - b.episodeNumber)
        .map((e) => ({
          episodeNumber: e.episodeNumber,
          title: e.title,
          isFreePreview: e.isFreePreview,
          isPremium: e.isPremium,
          isPublished: e.isPublished,
        })),
      suggestedPreviewEpisodeNumber: firstPreviewEp?.episodeNumber ?? null,
      suggestedFullEpisodeNumber: firstFullEp?.episodeNumber ?? null,
    },
  });
}
