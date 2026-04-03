'use client';

import type { StoryFormState } from '@/lib/admin/story-form';
import {
  AGE_FILTER_OPTIONS,
  DURATION_FILTER_OPTIONS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
} from '@/constants/storyFilters';

export default function StoryDiscoverySection({
  form,
  onChange,
}: {
  form: StoryFormState;
  onChange: (next: StoryFormState) => void;
}) {
  const field =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100';

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
        Discovery / library filters
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        These values power public browse filters and story cards. Options match
        the story library exactly.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Age range</span>
          <select
            className={field}
            value={form.ageRange}
            onChange={(e) =>
              onChange({
                ...form,
                ageRange: e.target.value as StoryFormState['ageRange'],
              })
            }
          >
            {AGE_FILTER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Genre</span>
          <select
            className={field}
            value={form.genre}
            onChange={(e) =>
              onChange({ ...form, genre: e.target.value as StoryFormState['genre'] })
            }
          >
            <option value="">Use catalog default</option>
            {GENRE_FILTER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Mood / use case
          </span>
          <select
            className={field}
            value={form.mood}
            onChange={(e) =>
              onChange({ ...form, mood: e.target.value as StoryFormState['mood'] })
            }
          >
            <option value="">Use catalog default</option>
            {MOOD_FILTER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Total duration (minutes)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            className={field}
            value={form.durationMinutes}
            onChange={(e) =>
              onChange({ ...form, durationMinutes: e.target.value })
            }
            placeholder="Auto from episodes if empty"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Duration bucket
          </span>
          <select
            className={field}
            value={form.durationBucket}
            onChange={(e) =>
              onChange({
                ...form,
                durationBucket: e.target.value as StoryFormState['durationBucket'],
              })
            }
          >
            <option value="auto">Auto from minutes</option>
            {DURATION_FILTER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} (override)
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Display duration label
          </span>
          <input
            className={field}
            value={form.durationLabel}
            onChange={(e) =>
              onChange({ ...form, durationLabel: e.target.value })
            }
            placeholder="e.g. 12 min"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Popularity score
          </span>
          <input
            type="number"
            className={field}
            value={form.popularityScore}
            onChange={(e) =>
              onChange({ ...form, popularityScore: e.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Published at</span>
          <input
            type="datetime-local"
            className={field}
            value={form.publishedAt}
            onChange={(e) =>
              onChange({ ...form, publishedAt: e.target.value })
            }
          />
        </label>
        <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-bold text-slate-700">Visibility</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  onChange({ ...form, isPublished: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
              />
              Published
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={form.isPremium}
                onChange={(e) =>
                  onChange({ ...form, isPremium: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
              />
              Premium
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) =>
                  onChange({ ...form, isFeatured: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
              />
              Featured
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={form.isSeries}
                onChange={(e) =>
                  onChange({ ...form, isSeries: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
              />
              Series (multi-episode)
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
