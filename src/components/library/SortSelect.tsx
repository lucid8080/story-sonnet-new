'use client';

import type { SortOption } from '@/types/story';
import { SORT_OPTIONS } from '@/constants/storyFilters';

type Props = {
  value: SortOption;
  onChange: (sort: SortOption) => void;
  id?: string;
};

export default function SortSelect({ value, onChange, id = 'library-sort' }: Props) {
  return (
    <div className="flex min-h-11 items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Sort stories
      </label>
      <span className="hidden text-sm font-semibold text-slate-600 sm:inline">
        Sort
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="min-h-11 min-w-[9.5rem] cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
