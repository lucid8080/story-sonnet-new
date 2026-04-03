'use client';

import type { StoryFormState } from '@/lib/admin/story-form';

export default function StorySeoSection({
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
        SEO / routing
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Slug is edited under Basic info. Optional meta tags for future use.
      </p>
      <div className="mt-4 grid gap-4">
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Meta title</span>
          <input
            className={field}
            value={form.metaTitle}
            onChange={(e) => onChange({ ...form, metaTitle: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Meta description
          </span>
          <textarea
            rows={3}
            className={field}
            value={form.metaDescription}
            onChange={(e) =>
              onChange({ ...form, metaDescription: e.target.value })
            }
          />
        </label>
      </div>
    </section>
  );
}
