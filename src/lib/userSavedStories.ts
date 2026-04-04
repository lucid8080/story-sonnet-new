import prisma from '@/lib/prisma';
import { fetchStories } from '@/lib/stories';
import { mapAppStoriesToBrowseStories } from '@/lib/browseStory';
import type { BrowseStory } from '@/types/story';

export async function fetchSavedStorySlugs(userId: string): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await prisma.userSavedStory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { storySlug: true },
    });
    return rows.map((r) => r.storySlug);
  } catch (e) {
    console.warn('[fetchSavedStorySlugs]', e);
    return [];
  }
}

/** Browse rows for saved slugs, preserving save order (newest save first). */
export async function browseStoriesForSavedSlugs(
  slugs: string[]
): Promise<BrowseStory[]> {
  if (!slugs.length) return [];
  const browse = mapAppStoriesToBrowseStories(await fetchStories());
  const bySlug = new Map(browse.map((s) => [s.slug, s]));
  const out: BrowseStory[] = [];
  for (const slug of slugs) {
    const row = bySlug.get(slug);
    if (row) out.push(row);
  }
  return out;
}
