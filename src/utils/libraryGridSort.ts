import type { SortOption } from '@/constants/storyFilters';
import { getBrowseSeedForSlug } from '@/data/storyBrowseSeed';
import type { AppStory } from '@/lib/stories';
import type { BrowseStory } from '@/types/story';

export type LibraryGridSortKey = {
  isFeatured: boolean;
  listedAt: string;
  sortPriority: number;
  popularityScore: number;
  title: string;
};

export function appStoryToLibraryGridSortKey(story: AppStory): LibraryGridSortKey {
  const seed = getBrowseSeedForSlug(story.slug);
  const listedAt =
    story.createdAt?.trim() ||
    story.publishedAt?.trim() ||
    seed.publishedAt;
  const title = story.cardTitleOverride?.trim()
    ? story.cardTitleOverride
    : story.title;
  return {
    isFeatured: !!(story.isFeatured ?? seed.isFeatured ?? false),
    listedAt,
    sortPriority: story.sortPriority ?? 0,
    popularityScore: story.popularityScore ?? seed.popularityScore,
    title,
  };
}

export function browseStoryToLibraryGridSortKey(
  story: BrowseStory
): LibraryGridSortKey {
  return {
    isFeatured: !!story.isFeatured,
    listedAt: story.listedAt,
    sortPriority: story.sortPriority ?? 0,
    popularityScore: story.popularityScore,
    title: story.title,
  };
}

export function compareLibraryGridRows(
  a: LibraryGridSortKey,
  b: LibraryGridSortKey,
  sort: SortOption
): number {
  const af = a.isFeatured ? 1 : 0;
  const bf = b.isFeatured ? 1 : 0;
  if (bf !== af) return bf - af;

  if (sort === 'newest') {
    const t = b.listedAt.localeCompare(a.listedAt);
    if (t !== 0) return t;
    const sp = b.sortPriority - a.sortPriority;
    if (sp !== 0) return sp;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  }

  const p = b.popularityScore - a.popularityScore;
  if (p !== 0) return p;
  const sp = b.sortPriority - a.sortPriority;
  if (sp !== 0) return sp;
  const t = b.listedAt.localeCompare(a.listedAt);
  if (t !== 0) return t;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function sortAppStoriesForLibraryGrid(
  stories: AppStory[],
  sort: SortOption = 'newest'
): AppStory[] {
  return [...stories].sort((a, b) =>
    compareLibraryGridRows(
      appStoryToLibraryGridSortKey(a),
      appStoryToLibraryGridSortKey(b),
      sort
    )
  );
}
