'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import type { StoryFormState } from '@/lib/admin/story-form';

type NarratorOption = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
};

export default function StoryNarratorsSection({
  form,
  setForm,
}: {
  form: StoryFormState;
  setForm: React.Dispatch<React.SetStateAction<StoryFormState>>;
}) {
  const [options, setOptions] = useState<NarratorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/narrators');
      const data = (await res.json()) as {
        ok?: boolean;
        items?: NarratorOption[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setLoadError(data.error || `Failed (${res.status})`);
        return;
      }
      setOptions(data.items ?? []);
    } catch {
      setLoadError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setForm((prev) => {
      const has = prev.narratorIds.includes(id);
      return {
        ...prev,
        narratorIds: has
          ? prev.narratorIds.filter((x) => x !== id)
          : [...prev.narratorIds, id],
      };
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
            Narrators
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Choose who reads this series. Shown on the public story page as{' '}
            <span className="font-medium text-slate-800">Narrator: …</span> and
            on the narrators directory.
          </p>
        </div>
        <a
          href="/admin/narrators"
          className="text-sm font-semibold text-violet-700 hover:text-violet-800"
        >
          Manage narrators
        </a>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading narrators…</p>
      ) : loadError ? (
        <p className="mt-4 text-sm text-rose-600">{loadError}</p>
      ) : options.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No narrators yet.{' '}
          <a href="/admin/narrators" className="font-semibold text-violet-700">
            Add one
          </a>{' '}
          first, then assign it here.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {options.map((n) => {
            const checked = form.narratorIds.includes(n.id);
            return (
              <li key={n.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                    checked
                      ? 'border-violet-300 bg-violet-50/80'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(n.id)}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  />
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                    {n.avatarUrl ? (
                      <Image
                        src={n.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                        {n.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {n.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {n.slug}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
