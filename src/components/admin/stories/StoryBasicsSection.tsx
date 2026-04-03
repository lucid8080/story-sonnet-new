'use client';

import type { StoryFormState } from '@/lib/admin/story-form';
import Link from 'next/link';

export default function StoryBasicsSection({
  form,
  onChange,
}: {
  form: StoryFormState;
  onChange: (next: StoryFormState) => void;
}) {
  const field =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100';

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
        Basic info
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Title, slug, descriptions, and cover used on story pages and cards.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Story series title
          </span>
          <input
            className={field}
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Slug</span>
          <input
            className={field}
            value={form.slug}
            onChange={(e) =>
              onChange({
                ...form,
                slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
              })
            }
          />
          <span className="mt-1 block text-[11px] text-amber-700">
            Changing the slug updates the public URL{' '}
            <code className="rounded bg-slate-100 px-1">/story/{form.slug || '…'}</code>
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Subtitle (optional)
          </span>
          <input
            className={field}
            value={form.subtitle}
            onChange={(e) => onChange({ ...form, subtitle: e.target.value })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Short description
          </span>
          <textarea
            rows={3}
            className={field}
            value={form.summary}
            onChange={(e) => onChange({ ...form, summary: e.target.value })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Full / series description
          </span>
          <textarea
            rows={5}
            className={field}
            value={form.fullDescription}
            onChange={(e) =>
              onChange({ ...form, fullDescription: e.target.value })
            }
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Cover image URL
          </span>
          <input
            className={field}
            value={form.coverUrl}
            onChange={(e) => onChange({ ...form, coverUrl: e.target.value })}
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            Upload assets in{' '}
            <Link
              href="/admin/uploads"
              className="font-semibold text-violet-600 hover:underline"
            >
              Uploads
            </Link>{' '}
            and paste the URL here.
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Accent (optional)
          </span>
          <input
            className={field}
            placeholder="#7c3aed"
            value={form.accent}
            onChange={(e) => onChange({ ...form, accent: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}
