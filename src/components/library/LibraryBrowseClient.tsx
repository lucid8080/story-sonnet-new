'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Bookmark, SlidersHorizontal } from 'lucide-react';
import {
  defaultStoryFiltersState,
  type BrowseStory,
  type SortOption,
  type StoryFiltersState,
} from '@/types/story';
import { filterAndSortStories } from '@/utils/filterStories';
import FilterSidebar from '@/components/library/FilterSidebar';
import FilterDrawer from '@/components/library/FilterDrawer';
import SortSelect from '@/components/library/SortSelect';
import ActiveFilterChips from '@/components/library/ActiveFilterChips';
import StoryCard from '@/components/library/StoryCard';
import EmptyResults from '@/components/library/EmptyResults';
import type {
  SpotlightRailDTO,
  StorySpotlightBadgeDTO,
} from '@/lib/content-spotlight/types';
import { SpotlightCollectionRail } from '@/components/spotlight/SpotlightCollectionRail';

type Props = {
  initialStories: BrowseStory[];
  savedSlugs?: string[];
  isLoggedIn?: boolean;
  initialSort?: SortOption;
  initialFilters?: StoryFiltersState;
  spotlightRails?: SpotlightRailDTO[];
  spotlightBadgeBySlug?: Record<string, StorySpotlightBadgeDTO | undefined>;
};

export default function LibraryBrowseClient({
  initialStories,
  savedSlugs = [],
  isLoggedIn = false,
  initialSort,
  initialFilters,
  spotlightRails = [],
  spotlightBadgeBySlug = {},
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<StoryFiltersState>(
    () => initialFilters ?? defaultStoryFiltersState()
  );
  const [sort, setSort] = useState<SortOption>(
    () => initialSort ?? 'newest'
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  const savedSlugSet = useMemo(() => new Set(savedSlugs), [savedSlugs]);

  const results = useMemo(() => {
    const base = filterAndSortStories(initialStories, filters, sort);
    if (!savedOnly) return base;
    return base.filter((s) => savedSlugSet.has(s.slug));
  }, [initialStories, filters, sort, savedOnly, savedSlugSet]);

  const clearFilters = () => setFilters(defaultStoryFiltersState());

  const hasActiveFilters =
    filters.ageRanges.length > 0 ||
    filters.genres.length > 0 ||
    filters.durationBuckets.length > 0 ||
    filters.moods.length > 0 ||
    filters.seriesModes.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-3 pb-16 pt-8 sm:px-4 lg:px-4">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Story library
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Browse by age, length, and mood—everything is built for calm listening
          with kids.
        </p>
      </header>

      {spotlightRails.map((rail) => (
        <SpotlightCollectionRail key={rail.spotlightId} rail={rail} />
      ))}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700" aria-live="polite">
          {results.length}{' '}
          {results.length === 1 ? 'story' : 'stories'}
          {savedOnly
            ? ' in your saved list'
            : hasActiveFilters
              ? ' match your filters'
              : ' to explore'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-md ring-1 ring-slate-200 hover:bg-slate-50 lg:hidden"
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
            Filters
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) {
                router.push(
                  `/login?callbackUrl=${encodeURIComponent('/library')}`
                );
                return;
              }
              setSavedOnly((v) => !v);
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-md ring-1 transition ${
              savedOnly
                ? 'bg-sky-100 text-sky-900 ring-sky-200'
                : 'bg-white text-slate-800 ring-slate-200 hover:bg-slate-50'
            }`}
            aria-pressed={savedOnly}
          >
            <Bookmark
              className={`h-5 w-5 ${savedOnly ? 'fill-current' : ''}`}
              aria-hidden
            />
            Saved
          </button>
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      <div className="mb-6">
        <ActiveFilterChips filters={filters} onFiltersChange={setFilters} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,16rem)_1fr] lg:items-start">
        <FilterSidebar filters={filters} onFiltersChange={setFilters} />

        <section aria-label="Story results">
          {results.length === 0 && savedOnly && isLoggedIn ? (
            <div
              role="status"
              className="flex flex-col items-center justify-center rounded-3xl bg-white/90 px-6 py-16 text-center shadow-inner ring-1 ring-slate-100"
            >
              <p className="text-lg font-black text-slate-900">
                No saved series yet
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                Open any story, sign in, and tap &quot;Add to library&quot; to
                collect favorites here.
              </p>
              <button
                type="button"
                onClick={() => setSavedOnly(false)}
                className="mt-6 min-h-12 rounded-full bg-slate-900 px-6 text-sm font-bold text-white shadow-md hover:bg-slate-800"
              >
                Browse all stories
              </button>
            </div>
          ) : results.length === 0 ? (
            <EmptyResults onClearFilters={clearFilters} />
          ) : (
            <ul className="grid list-none grid-cols-2 gap-6 p-0 xl:grid-cols-3">
              {results.map((story) => (
                <li key={story.slug}>
                  <StoryCard
                    story={story}
                    spotlightBadge={spotlightBadgeBySlug[story.slug]}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </main>
  );
}
