'use client';

import type { StoryFiltersState } from '@/types/story';
import {
  AGE_FILTER_OPTIONS,
  DURATION_FILTER_OPTIONS,
  FILTER_SECTION_LABELS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
  SERIES_FILTER_OPTIONS,
} from '@/constants/storyFilters';

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

type Props = {
  filters: StoryFiltersState;
  onChange: (next: StoryFiltersState) => void;
  idPrefix: string;
};

export default function LibraryFilterFields({
  filters,
  onChange,
  idPrefix,
}: Props) {
  return (
    <div className="flex flex-col gap-8">
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-3 text-sm font-bold text-slate-900">
          {FILTER_SECTION_LABELS.age}
        </legend>
        <ul className="flex flex-col gap-2">
          {AGE_FILTER_OPTIONS.map((opt) => {
            const id = `${idPrefix}age-${opt.id}`;
            const checked = filters.ageRanges.includes(opt.id);
            return (
              <li key={opt.id}>
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-slate-700 hover:bg-white/80"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...filters,
                        ageRanges: toggle(filters.ageRanges, opt.id),
                      })
                    }
                    className="h-5 w-5 shrink-0 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                  />
                  <span>{opt.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-3 text-sm font-bold text-slate-900">
          {FILTER_SECTION_LABELS.genre}
        </legend>
        <ul className="flex flex-col gap-2">
          {GENRE_FILTER_OPTIONS.map((opt) => {
            const id = `${idPrefix}genre-${opt.id}`;
            const checked = filters.genres.includes(opt.id);
            return (
              <li key={opt.id}>
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-slate-700 hover:bg-white/80"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...filters,
                        genres: toggle(filters.genres, opt.id),
                      })
                    }
                    className="h-5 w-5 shrink-0 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                  />
                  <span>{opt.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-3 text-sm font-bold text-slate-900">
          {FILTER_SECTION_LABELS.duration}
        </legend>
        <ul className="flex flex-col gap-2">
          {DURATION_FILTER_OPTIONS.map((opt) => {
            const id = `${idPrefix}dur-${opt.id}`;
            const checked = filters.durationBuckets.includes(opt.id);
            return (
              <li key={opt.id}>
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-slate-700 hover:bg-white/80"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...filters,
                        durationBuckets: toggle(
                          filters.durationBuckets,
                          opt.id
                        ),
                      })
                    }
                    className="h-5 w-5 shrink-0 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                  />
                  <span>{opt.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-3 text-sm font-bold text-slate-900">
          {FILTER_SECTION_LABELS.mood}
        </legend>
        <ul className="flex flex-col gap-2">
          {MOOD_FILTER_OPTIONS.map((opt) => {
            const id = `${idPrefix}mood-${opt.id}`;
            const checked = filters.moods.includes(opt.id);
            return (
              <li key={opt.id}>
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-slate-700 hover:bg-white/80"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...filters,
                        moods: toggle(filters.moods, opt.id),
                      })
                    }
                    className="h-5 w-5 shrink-0 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                  />
                  <span>{opt.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-3 text-sm font-bold text-slate-900">
          {FILTER_SECTION_LABELS.series}
        </legend>
        <ul className="flex flex-col gap-2">
          {SERIES_FILTER_OPTIONS.map((opt) => {
            const id = `${idPrefix}series-${opt.id}`;
            const checked = filters.seriesModes.includes(opt.id);
            return (
              <li key={opt.id}>
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-slate-700 hover:bg-white/80"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...filters,
                        seriesModes: toggle(filters.seriesModes, opt.id),
                      })
                    }
                    className="h-5 w-5 shrink-0 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                  />
                  <span>{opt.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
