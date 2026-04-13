'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { GripVertical, Trash2, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { toast } from 'sonner';

export type PickedStory = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  sortOrder: number;
  isFeatured: boolean;
};

type Props = {
  stories: PickedStory[];
  onChange: (next: PickedStory[]) => void;
};

type SearchResultRow = {
  id: string | null;
  slug: string;
  title: string;
  seriesTitle?: string;
  coverUrl: string | null;
  catalogOnly?: boolean;
};

export function SpotlightStoriesEditor({ stories, onChange }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResultRow[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(
      `/api/admin/content-calendar/stories/search?q=${encodeURIComponent(q.trim())}`
    );
    const j = await res.json();
    if (!res.ok || !j.ok) {
      setResults([]);
      toast.error(j.error || 'Story search failed');
      return;
    }
    setResults(j.stories as SearchResultRow[]);
  }, [q]);

  const addStory = async (s: SearchResultRow) => {
    if (stories.some((x) => x.slug === s.slug)) return;

    let id = s.id;
    let title = s.title;
    let coverUrl = s.coverUrl;

    if (s.catalogOnly || id == null) {
      const res = await fetch(
        '/api/admin/content-calendar/stories/ensure-from-catalog',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: s.slug }),
        }
      );
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast.error(j.error || 'Could not import catalog story into the database');
        return;
      }
      id = j.story.id as string;
      title = j.story.title as string;
      coverUrl = (j.story.coverUrl as string | null) ?? null;
    }

    const maxOrder = stories.reduce((m, x) => Math.max(m, x.sortOrder), -1);
    onChange([
      ...stories,
      {
        id: String(id),
        slug: s.slug,
        title,
        coverUrl,
        sortOrder: maxOrder + 1,
        isFeatured: false,
      },
    ]);
  };

  const remove = (id: string) => {
    onChange(stories.filter((s) => s.id !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    const sorted = [...stories].sort((a, b) => a.sortOrder - b.sortOrder);
    const i = sorted.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[i]!;
    const b = sorted[j]!;
    const next = stories.map((s) => {
      if (s.id === a.id) return { ...s, sortOrder: b.sortOrder };
      if (s.id === b.id) return { ...s, sortOrder: a.sortOrder };
      return s;
    });
    onChange(next);
  };

  const toggleFeatured = (id: string) => {
    onChange(
      stories.map((s) =>
        s.id === id ? { ...s, isFeatured: !s.isFeatured } : { ...s, isFeatured: false }
      )
    );
  };

  const sorted = [...stories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stories…"
          className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void search()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
        >
          Search
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Type at least 2 characters, then click Search. Results include database stories and
        catalog series not yet imported (Add creates a database row from the catalog when
        needed).
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm">
        {results.map((s) => (
          <li
            key={s.catalogOnly ? `c-${s.slug}` : `d-${s.id}`}
            className="flex items-center justify-between gap-2"
          >
            <span className="min-w-0 truncate">
              <span className="font-medium text-slate-800">{s.title}</span>
              {s.seriesTitle && s.seriesTitle !== s.title ? (
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {s.seriesTitle}
                  {s.catalogOnly ? ' · catalog' : ''}
                </span>
              ) : s.catalogOnly ? (
                <span className="mt-0.5 block text-xs text-slate-500">Catalog · not in DB yet</span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => void addStory(s)}
              className="shrink-0 rounded-full bg-teal-600 px-2 py-1 text-xs font-bold text-white hover:bg-teal-500"
            >
              Add
            </button>
          </li>
        ))}
        {results.length === 0 && q.length >= 2 ? (
          <li className="text-xs text-slate-500">No matches.</li>
        ) : null}
      </ul>

      <ul className="space-y-2">
        {sorted.map((s) => (
          <li
            key={s.id}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!dragId || dragId === s.id) return;
              const from = sorted.findIndex((x) => x.id === dragId);
              const to = sorted.findIndex((x) => x.id === s.id);
              if (from < 0 || to < 0) return;
              const re = [...sorted];
              const [item] = re.splice(from, 1);
              re.splice(to, 0, item!);
              onChange(
                re.map((row, idx) => ({ ...row, sortOrder: idx }))
              );
              setDragId(null);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
              {s.coverUrl ? (
                <Image src={s.coverUrl} alt="" fill className="object-cover" sizes="40px" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900">{s.title}</div>
              <div className="truncate text-xs text-slate-500">{s.slug}</div>
            </div>
            <button
              type="button"
              onClick={() => toggleFeatured(s.id)}
              className={
                s.isFeatured
                  ? 'rounded-full bg-amber-400 p-1.5 text-amber-950'
                  : 'rounded-full p-1.5 text-slate-400 hover:bg-slate-100'
              }
              title="Featured in spotlight"
            >
              <Star className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
              onClick={() => move(s.id, -1)}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
              onClick={() => move(s.id, 1)}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full p-1 text-red-600 hover:bg-red-50"
              onClick={() => remove(s.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
