'use client';

import { X } from 'lucide-react';
import {
  AGE_FILTER_OPTIONS,
  DURATION_FILTER_OPTIONS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
  SERIES_FILTER_OPTIONS,
} from '@/constants/storyFilters';
import {
  defaultStoryFiltersState,
  type ActiveFilterChip,
  type StoryFiltersState,
} from '@/types/story';

function labelFor(
  options: readonly { id: string; label: string }[],
  id: string
): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

function buildActiveFilterChips(filters: StoryFiltersState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const id of filters.ageRanges) {
    chips.push({
      key: `ageRanges:${id}`,
      label: labelFor(AGE_FILTER_OPTIONS, id),
      group: 'ageRanges',
      value: id,
    });
  }
  for (const id of filters.genres) {
    chips.push({
      key: `genres:${id}`,
      label: labelFor(GENRE_FILTER_OPTIONS, id),
      group: 'genres',
      value: id,
    });
  }
  for (const id of filters.durationBuckets) {
    chips.push({
      key: `durationBuckets:${id}`,
      label: labelFor(DURATION_FILTER_OPTIONS, id),
      group: 'durationBuckets',
      value: id,
    });
  }
  for (const id of filters.moods) {
    chips.push({
      key: `moods:${id}`,
      label: labelFor(MOOD_FILTER_OPTIONS, id),
      group: 'moods',
      value: id,
    });
  }
  for (const id of filters.seriesModes) {
    chips.push({
      key: `seriesModes:${id}`,
      label: labelFor(SERIES_FILTER_OPTIONS, id),
      group: 'seriesModes',
      value: id,
    });
  }

  return chips;
}

function removeFilterValue(
  filters: StoryFiltersState,
  group: ActiveFilterChip['group'],
  value: string
): StoryFiltersState {
  switch (group) {
    case 'ageRanges':
      return {
        ...filters,
        ageRanges: filters.ageRanges.filter((v) => v !== value),
      };
    case 'genres':
      return {
        ...filters,
        genres: filters.genres.filter((v) => v !== value),
      };
    case 'durationBuckets':
      return {
        ...filters,
        durationBuckets: filters.durationBuckets.filter((v) => v !== value),
      };
    case 'moods':
      return {
        ...filters,
        moods: filters.moods.filter((v) => v !== value),
      };
    case 'seriesModes':
      return {
        ...filters,
        seriesModes: filters.seriesModes.filter((v) => v !== value),
      };
    default:
      return filters;
  }
}

type Props = {
  filters: StoryFiltersState;
  onFiltersChange: (next: StoryFiltersState) => void;
};

export default function ActiveFilterChips({
  filters,
  onFiltersChange,
}: Props) {
  const chips = buildActiveFilterChips(filters);
  const hasAny = chips.length > 0;

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Active
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-label={`Remove filter: ${chip.label}`}
          onClick={() =>
            onFiltersChange(removeFilterValue(filters, chip.group, chip.value))
          }
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 ring-1 ring-rose-100 hover:bg-rose-100"
        >
          <span>{chip.label}</span>
          <X className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onFiltersChange(defaultStoryFiltersState())}
        className="min-h-9 rounded-full px-3 text-sm font-bold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
      >
        Clear all filters
      </button>
    </div>
  );
}
