'use client';

import type { StoryFiltersState } from '@/types/story';
import LibraryFilterFields from '@/components/library/LibraryFilterFields';

type Props = {
  filters: StoryFiltersState;
  onFiltersChange: (next: StoryFiltersState) => void;
};

export default function FilterSidebar({ filters, onFiltersChange }: Props) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-2xl bg-white/90 p-5 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 backdrop-blur">
        <h2 className="mb-4 text-lg font-black text-slate-900">Narrow it down</h2>
        <p className="mb-6 text-sm text-slate-600">
          Pick what fits your family—mix and match.
        </p>
        <LibraryFilterFields
          filters={filters}
          onChange={onFiltersChange}
          idPrefix="sidebar-"
        />
      </div>
    </aside>
  );
}
