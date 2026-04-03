'use client';

import { useEffect, useRef } from 'react';
import type { StoryFiltersState } from '@/types/story';
import LibraryFilterFields from '@/components/library/LibraryFilterFields';

type Props = {
  open: boolean;
  onClose: () => void;
  filters: StoryFiltersState;
  onFiltersChange: (next: StoryFiltersState) => void;
};

export default function FilterDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="filter-drawer-title"
            className="text-lg font-black text-slate-900"
          >
            Filters
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-full bg-slate-100 px-4 text-sm font-bold text-slate-800 hover:bg-slate-200"
          >
            Done
          </button>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Tap what you need—results update as you go.
        </p>
        <LibraryFilterFields
          filters={filters}
          onChange={onFiltersChange}
          idPrefix="drawer-"
        />
      </div>
    </div>
  );
}
