'use client';

import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
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

type Props = {
  initialStories: BrowseStory[];
};

export default function LibraryBrowseClient({ initialStories }: Props) {
  const [filters, setFilters] = useState<StoryFiltersState>(
    defaultStoryFiltersState
  );
  const [sort, setSort] = useState<SortOption>('newest');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const results = useMemo(
    () => filterAndSortStories(initialStories, filters, sort),
    [initialStories, filters, sort]
  );

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

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700" aria-live="polite">
          {results.length}{' '}
          {results.length === 1 ? 'story' : 'stories'}
          {hasActiveFilters ? ' match your filters' : ' to explore'}
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
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      <div className="mb-6">
        <ActiveFilterChips filters={filters} onFiltersChange={setFilters} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,16rem)_1fr] lg:items-start">
        <FilterSidebar filters={filters} onFiltersChange={setFilters} />

        <section aria-label="Story results">
          {results.length === 0 ? (
            <EmptyResults onClearFilters={clearFilters} />
          ) : (
            <ul className="grid list-none gap-6 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((story) => (
                <li key={story.slug}>
                  <StoryCard story={story} />
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
