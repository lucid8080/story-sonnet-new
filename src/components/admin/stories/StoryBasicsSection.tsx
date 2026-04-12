'use client';

import type { StoryFormState } from '@/lib/admin/story-form';
import { isValidStorySlug, normalizeStorySlug } from '@/lib/slug';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type CoverListItem = { key: string; url: string };

export default function StoryBasicsSection({
  form,
  onChange,
}: {
  form: StoryFormState;
  onChange: (next: StoryFormState) => void;
}) {
  const field =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100';

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverScope, setCoverScope] = useState<'all' | 'story'>('all');
  const [coverItems, setCoverItems] = useState<CoverListItem[]>([]);
  const [coverNextToken, setCoverNextToken] = useState<string | undefined>();
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverLoadMoreLoading, setCoverLoadMoreLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  const normalizedSlug = normalizeStorySlug(form.slug);
  const canScopeToStory = isValidStorySlug(normalizedSlug);

  const listPrefix = useMemo(() => {
    if (coverScope === 'story' && canScopeToStory) {
      return `covers/${normalizedSlug}/`;
    }
    return 'covers/';
  }, [coverScope, canScopeToStory, normalizedSlug]);

  useEffect(() => {
    if (coverScope === 'story' && !canScopeToStory) {
      setCoverScope('all');
    }
  }, [coverScope, canScopeToStory]);

  const fetchCoversPage = useCallback(
    async (opts: {
      continuationToken?: string;
      append: boolean;
      signal?: AbortSignal;
    }) => {
      const qs = new URLSearchParams({
        prefix: listPrefix,
        maxKeys: '300',
      });
      if (opts.continuationToken) {
        qs.set('continuationToken', opts.continuationToken);
      }
      const res = await fetch(`/api/admin/covers?${qs.toString()}`, {
        signal: opts.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: CoverListItem[];
        nextContinuationToken?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const items = data.items ?? [];
      setCoverNextToken(data.nextContinuationToken);
      if (opts.append) {
        setCoverItems((prev) => {
          const seen = new Set(prev.map((x) => x.key));
          const merged = [...prev];
          for (const it of items) {
            if (!seen.has(it.key)) {
              seen.add(it.key);
              merged.push(it);
            }
          }
          return merged;
        });
      } else {
        setCoverItems(items);
      }
    },
    [listPrefix]
  );

  useEffect(() => {
    if (!coverPickerOpen) return;
    const ac = new AbortController();
    let cancelled = false;
    setCoverError(null);
    setCoverLoading(true);
    setCoverNextToken(undefined);
    setCoverItems([]);
    fetchCoversPage({ append: false, signal: ac.signal })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setCoverError(
          e instanceof Error ? e.message : 'Failed to load covers'
        );
      })
      .finally(() => {
        if (!cancelled) setCoverLoading(false);
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [coverPickerOpen, listPrefix, fetchCoversPage]);

  const onLoadMoreCovers = async () => {
    if (!coverNextToken || coverLoadMoreLoading) return;
    setCoverLoadMoreLoading(true);
    setCoverError(null);
    try {
      await fetchCoversPage({
        continuationToken: coverNextToken,
        append: true,
      });
    } catch (e: unknown) {
      setCoverError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setCoverLoadMoreLoading(false);
    }
  };

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
        <div className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-700">
            Cover image URL
          </span>
          <input
            className={field}
            value={form.coverUrl}
            onChange={(e) => onChange({ ...form, coverUrl: e.target.value })}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCoverPickerOpen((o) => !o)}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
            >
              {coverPickerOpen ? 'Hide R2 cover gallery' : 'Browse covers in R2'}
            </button>
            <span className="text-[11px] text-slate-500">
              Or upload in{' '}
              <Link
                href="/admin/uploads"
                className="font-semibold text-violet-600 hover:underline"
              >
                Uploads
              </Link>{' '}
              and paste the URL.
            </span>
          </div>
          {coverPickerOpen ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Scope:
                </span>
                <button
                  type="button"
                  onClick={() => setCoverScope('all')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    coverScope === 'all'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  All covers
                </button>
                <button
                  type="button"
                  disabled={!canScopeToStory}
                  title={
                    !canScopeToStory
                      ? 'Set a valid slug to filter by this story’s folder'
                      : undefined
                  }
                  onClick={() => setCoverScope('story')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                    coverScope === 'story'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  This story’s folder
                </button>
                <code className="ml-auto max-w-full truncate rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
                  {listPrefix}
                </code>
              </div>
              {coverError ? (
                <p className="mt-2 text-xs text-rose-700">{coverError}</p>
              ) : null}
              {coverLoading ? (
                <p className="mt-3 text-xs text-slate-600">Loading covers…</p>
              ) : coverItems.length === 0 && !coverError ? (
                <p className="mt-3 text-xs text-slate-600">
                  No image files in this prefix. Upload a cover or try another
                  scope.
                </p>
              ) : (
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {coverItems.map((it) => {
                    const selected = form.coverUrl.trim() === it.url.trim();
                    return (
                      <li key={it.key}>
                        <button
                          type="button"
                          onClick={() =>
                            onChange({ ...form, coverUrl: it.url })
                          }
                          className={`group w-full overflow-hidden rounded-lg ring-2 ring-offset-1 transition ${
                            selected
                              ? 'ring-violet-600'
                              : 'ring-transparent hover:ring-violet-300'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={it.url}
                            alt=""
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                          <span className="block truncate px-1 pb-1 pt-0.5 text-[9px] text-slate-500 group-hover:text-slate-700">
                            {it.key.replace(/^covers\//, '')}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {coverNextToken ? (
                <button
                  type="button"
                  disabled={coverLoadMoreLoading}
                  onClick={() => void onLoadMoreCovers()}
                  className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {coverLoadMoreLoading ? 'Loading…' : 'Load more'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
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
