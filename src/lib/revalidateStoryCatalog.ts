import { revalidateTag } from 'next/cache';

/** Bust Data Cache for catalog, story pages, recommendations, theme probes, spotlights. */
export function revalidateStoryCatalog(slug?: string) {
  revalidateTag('story-catalog');
  revalidateTag('spotlight');
  if (slug?.trim()) {
    const s = slug.trim();
    revalidateTag(`story:${s}`);
    revalidateTag(`story-rec:${s}`);
    revalidateTag(`theme-probe:${s}`);
  }
}
