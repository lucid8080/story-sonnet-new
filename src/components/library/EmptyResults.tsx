'use client';

type Props = {
  onClearFilters: () => void;
};

export default function EmptyResults({ onClearFilters }: Props) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-3xl bg-white/90 px-6 py-16 text-center shadow-inner ring-1 ring-slate-100"
    >
      <p className="text-lg font-black text-slate-900">
        No stories match those picks
      </p>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Try removing a filter or two—there is plenty to explore when you widen
        the search a bit.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-6 min-h-12 rounded-full bg-rose-500 px-6 text-sm font-bold text-white shadow-md shadow-rose-200 hover:bg-rose-600"
      >
        Clear all filters
      </button>
    </div>
  );
}
