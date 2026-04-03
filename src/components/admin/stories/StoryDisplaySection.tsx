'use client';

import type { StoryFormState } from '@/lib/admin/story-form';

export default function StoryDisplaySection({
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
        Display / card settings
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Overrides for the public library card without changing the canonical
        story title.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Card title override
          </span>
          <input
            className={field}
            value={form.cardTitleOverride}
            onChange={(e) =>
              onChange({ ...form, cardTitleOverride: e.target.value })
            }
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Card description override
          </span>
          <textarea
            rows={3}
            className={field}
            value={form.cardDescriptionOverride}
            onChange={(e) =>
              onChange({
                ...form,
                cardDescriptionOverride: e.target.value,
              })
            }
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Badge label override
          </span>
          <input
            className={field}
            value={form.badgeLabelOverride}
            onChange={(e) =>
              onChange({ ...form, badgeLabelOverride: e.target.value })
            }
            placeholder="Optional custom badge on cards"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Sort priority
          </span>
          <input
            type="number"
            className={field}
            value={form.sortPriority}
            onChange={(e) =>
              onChange({ ...form, sortPriority: e.target.value })
            }
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            Higher sorts first within the same date/popularity sort.
          </span>
        </label>
      </div>
    </section>
  );
}
