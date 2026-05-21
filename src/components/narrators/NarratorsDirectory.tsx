'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { NarratorDirectoryEntry } from '@/lib/narrators';

export function NarratorsDirectory({
  narrators,
  highlightSlug,
}: {
  narrators: NarratorDirectoryEntry[];
  /** When set (e.g. from `/narrators?narrator=slug`), opens that profile card. */
  highlightSlug?: string | null;
}) {
  const searchParams = useSearchParams();
  const narratorFromUrl = searchParams.get('narrator') ?? highlightSlug ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!narratorFromUrl) return;
    const match = narrators.find((n) => n.slug === narratorFromUrl);
    if (!match) return;
    setExpandedId(match.id);
    const el = document.getElementById(`narrator-${match.slug}`);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [narratorFromUrl, narrators]);

  if (!narrators.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-600">
        Narrators will appear here once they are added in admin.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {narrators.map((n) => {
        const expanded = expandedId === n.id;
        const storyCount = n.stories.length;
        return (
          <li
            id={`narrator-${n.slug}`}
            key={n.id}
            className={`overflow-hidden rounded-2xl border bg-white shadow-sm shadow-slate-200/50 transition ${
              narratorFromUrl === n.slug
                ? 'border-violet-300 ring-2 ring-violet-200/80'
                : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-slate-50/80"
              onClick={() => setExpandedId(expanded ? null : n.id)}
              aria-expanded={expanded}
            >
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-violet-100 to-rose-100 ring-2 ring-white shadow">
                {n.avatarUrl ? (
                  <Image
                    src={n.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-black text-violet-700/80">
                    {n.name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-black text-slate-900">
                  {n.name}
                </span>
                {n.bio ? (
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600 line-clamp-2">
                    {n.bio}
                  </span>
                ) : null}
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] text-violet-700">
                  {storyCount === 0
                    ? 'No published stories yet'
                    : `${storyCount} ${storyCount === 1 ? 'story' : 'stories'}`}
                  {storyCount > 0 ? (
                    expanded ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    )
                  ) : null}
                </span>
              </span>
            </button>

            {expanded ? (
              <ul className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                {n.stories.length === 0 ? (
                  <li className="px-2 py-2 text-sm text-slate-500">
                    No published stories yet.
                  </li>
                ) : null}
                {n.stories.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/story/${s.slug}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white"
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                        {s.cover ? (
                          <Image
                            src={s.cover}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                            —
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {s.seriesTitle}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
