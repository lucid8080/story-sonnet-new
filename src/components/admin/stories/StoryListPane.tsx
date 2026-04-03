'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AppStory } from '@/lib/stories';
import StoryStatusBadges from './StoryStatusBadges';

export default function StoryListPane({
  stories,
  selectedId,
  onSelect,
  onAddStory,
  adding,
}: {
  stories: AppStory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddStory: () => void;
  adding: boolean;
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return stories;
    return stories.filter((s) => {
      const hay = `${s.title} ${s.slug} ${s.seriesTitle}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [stories, q]);

  return (
    <div className="flex h-full min-h-[70vh] flex-col border-slate-200 bg-white lg:border-r">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900">Stories</h2>
          <button
            type="button"
            onClick={onAddStory}
            disabled={adding}
            className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-600 disabled:opacity-50"
          >
            {adding ? 'Adding…' : '+ Add story'}
          </button>
        </div>
        <input
          type="search"
          placeholder="Search title, slug, series…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-violet-100 focus:border-violet-300 focus:ring-2"
        />
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-slate-500">
            No stories match your search.
          </li>
        ) : (
          filtered.map((story) => {
            const active = selectedId === story.id;
            return (
              <li key={story.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => onSelect(story.id)}
                  className={
                    active
                      ? 'w-full rounded-xl border border-violet-200 bg-violet-50 p-3 text-left shadow-sm ring-1 ring-violet-100'
                      : 'w-full rounded-xl border border-transparent p-3 text-left hover:bg-slate-50'
                  }
                >
                  <div className="font-bold text-slate-900 line-clamp-2">
                    {story.title}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                    {story.slug}
                  </div>
                  <div className="mt-2">
                    <StoryStatusBadges story={story} compact />
                  </div>
                  <Link
                    href={`/story/${story.slug}`}
                    className="mt-2 inline-block text-[11px] font-semibold text-violet-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View public page
                  </Link>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
