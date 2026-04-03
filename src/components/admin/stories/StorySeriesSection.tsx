'use client';

import type { StoryFormState } from '@/lib/admin/story-form';

export default function StorySeriesSection({
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
        Series metadata
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Series name appears on detail views when marked as a series.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">Series name</span>
          <input
            className={field}
            value={form.seriesTitle}
            onChange={(e) =>
              onChange({ ...form, seriesTitle: e.target.value })
            }
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Series tagline
          </span>
          <input
            className={field}
            value={form.seriesTagline}
            onChange={(e) =>
              onChange({ ...form, seriesTagline: e.target.value })
            }
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Story universe / collection
          </span>
          <input
            className={field}
            value={form.universe}
            onChange={(e) => onChange({ ...form, universe: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Reading / listening level
          </span>
          <input
            className={field}
            value={form.readingLevel}
            onChange={(e) =>
              onChange({ ...form, readingLevel: e.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Legacy age label (optional)
          </span>
          <input
            className={field}
            value={form.ageGroup}
            onChange={(e) => onChange({ ...form, ageGroup: e.target.value })}
            placeholder="e.g. 5–8"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Topics / life lessons
          </span>
          <input
            className={field}
            value={form.topics}
            onChange={(e) => onChange({ ...form, topics: e.target.value })}
            placeholder="Comma-separated chips"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Character tags
          </span>
          <input
            className={field}
            value={form.characterTags}
            onChange={(e) =>
              onChange({ ...form, characterTags: e.target.value })
            }
            placeholder="Comma-separated"
          />
        </label>
      </div>
    </section>
  );
}
