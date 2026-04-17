'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';

type SearchRow = {
  slug: string;
  title: string;
  seriesTitle: string;
  coverUrl: string | null;
};

type MetaEpisode = {
  episodeNumber: number;
  title: string;
  isFreePreview: boolean;
  isPremium: boolean;
  isPublished: boolean;
};

type MetaStory = {
  slug: string;
  title: string;
  coverUrl: string | null;
  episodes: MetaEpisode[];
  suggestedPreviewEpisodeNumber: number | null;
  suggestedFullEpisodeNumber: number | null;
};

type AudioChoice = 'none' | 'preview' | 'full' | 'episode';

export function StoryEmbedPicker({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (attrs: StoryEmbedAttrs) => void;
}) {
  const PAGE_SIZE = 18;
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaStory | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [showCover, setShowCover] = useState(true);
  const [audioChoice, setAudioChoice] = useState<AudioChoice>('none');
  const [episodePick, setEpisodePick] = useState<number | null>(null);

  const loadMeta = useCallback(async (slug: string) => {
    setMetaLoading(true);
    setMeta(null);
    try {
      const res = await fetch(
        `/api/admin/blog/embed-story/meta?slug=${encodeURIComponent(slug)}`
      );
      const data = (await res.json()) as {
        ok?: boolean;
        story?: MetaStory;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.story) {
        return;
      }
      setMeta(data.story);
      const firstPub =
        data.story.episodes.find((e) => e.isPublished)?.episodeNumber ?? null;
      setEpisodePick(firstPub);
      setAudioChoice('none');
      setShowCover(true);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setDebouncedQ('');
    setPage(1);
    setTotal(0);
    setResults([]);
    setSelectedSlug(null);
    setMeta(null);
    setShowCover(true);
    setAudioChoice('none');
    setEpisodePick(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    const t = setTimeout(() => {
      setDebouncedQ((prev) => {
        if (trimmed !== prev) setPage(1);
        return trimmed;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (debouncedQ.length > 0) params.set('q', debouncedQ);
        const res = await fetch(
          `/api/admin/blog/embed-story/browse?${params.toString()}`
        );
        const data = (await res.json()) as {
          ok?: boolean;
          stories?: SearchRow[];
          total?: number;
        };
        if (cancelled) return;
        if (res.ok && data.ok && Array.isArray(data.stories)) {
          setResults(data.stories);
          setTotal(typeof data.total === 'number' ? data.total : 0);
        } else {
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, page, debouncedQ]);

  const selectStory = (slug: string) => {
    setSelectedSlug(slug);
    void loadMeta(slug);
  };

  const resolveEpisodeNumber = (): number | null => {
    if (!meta) return null;
    if (audioChoice === 'none') return null;
    if (audioChoice === 'episode') return episodePick;
    if (audioChoice === 'preview') {
      return (
        meta.suggestedPreviewEpisodeNumber ??
        meta.episodes.find((e) => e.isPublished)?.episodeNumber ??
        null
      );
    }
    if (audioChoice === 'full') {
      return (
        meta.suggestedFullEpisodeNumber ??
        meta.episodes.find((e) => e.isPublished)?.episodeNumber ??
        null
      );
    }
    return null;
  };

  const confirm = () => {
    if (!meta) return;

    let audioMode: StoryEmbedAttrs['audioMode'] = 'none';
    if (audioChoice === 'preview') audioMode = 'preview';
    else if (audioChoice === 'full') audioMode = 'full';
    else if (audioChoice === 'episode') audioMode = 'episode';

    const episodeNumber = resolveEpisodeNumber();

    if (audioMode !== 'none' && episodeNumber == null) {
      return;
    }

    const attrs: StoryEmbedAttrs = {
      storySlug: meta.slug,
      storyTitle: meta.title,
      coverUrl: meta.coverUrl ?? '',
      showCover,
      audioMode,
      episodeNumber,
    };

    if (!attrs.showCover && attrs.audioMode === 'none') {
      return;
    }

    onInsert(attrs);
    onClose();
  };

  if (!open) return null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  const epResolved = resolveEpisodeNumber();
  const canConfirm = Boolean(
    meta &&
      !metaLoading &&
      (showCover || audioChoice !== 'none') &&
      (audioChoice === 'none' || epResolved != null)
  );

  const publishedEps =
    meta?.episodes.filter((e) => e.isPublished) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Embed story</h2>
        <p className="mt-1 text-xs text-slate-500">
          Stories load automatically. Search to narrow the same list, then pick
          a cover and/or audio.
        </p>

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Search
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search to narrow (optional)…"
          />
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Results update as you type (short pause). Use Next/Previous to browse
          pages.
        </p>

        {searching && (
          <p className="mt-2 text-xs text-slate-500">Loading stories…</p>
        )}

        {!searching && total === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No stories found.</p>
        ) : null}

        <div className="mt-3 max-h-[min(50vh,22rem)] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map((s) => {
              const selected = selectedSlug === s.slug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => selectStory(s.slug)}
                  className={`group flex flex-col overflow-hidden rounded-xl border-2 bg-white text-left shadow-sm transition ${
                    selected
                      ? 'border-violet-600 ring-2 ring-violet-400/40'
                      : 'border-slate-200 hover:border-violet-300 hover:shadow-md'
                  }`}
                >
                  <div className="relative aspect-[3/4] w-full bg-slate-100">
                    {s.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin picker; mixed asset hosts
                      <img
                        src={s.coverUrl}
                        alt=""
                        className="h-full w-full object-cover object-top transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-medium text-slate-400">
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 p-2">
                    <span className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900">
                      {s.title}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">
                      {s.slug}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {total > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
              {debouncedQ ? (
                <span className="text-slate-400">
                  {' '}
                  · filter &quot;{debouncedQ}&quot;
                </span>
              ) : null}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!hasPrev || searching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!hasNext || searching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {metaLoading && (
          <p className="mt-4 text-sm text-slate-500">Loading story…</p>
        )}

        {meta && !metaLoading && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showCover}
                onChange={(e) => setShowCover(e.target.checked)}
              />
              <span>Show cover (links to story page)</span>
            </label>

            <div>
              <span className="text-sm font-semibold text-slate-700">
                Audio
              </span>
              <div className="mt-1 space-y-1 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="audio"
                    checked={audioChoice === 'none'}
                    onChange={() => setAudioChoice('none')}
                  />
                  None
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="audio"
                    checked={audioChoice === 'preview'}
                    onChange={() => setAudioChoice('preview')}
                  />
                  Sample (first free-preview episode)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="audio"
                    checked={audioChoice === 'full'}
                    onChange={() => setAudioChoice('full')}
                  />
                  Full track (episode 1 / first published)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="audio"
                    checked={audioChoice === 'episode'}
                    onChange={() => setAudioChoice('episode')}
                  />
                  Specific episode
                </label>
              </div>
              {audioChoice === 'episode' && (
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={episodePick ?? ''}
                  onChange={(e) =>
                    setEpisodePick(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">Choose episode…</option>
                  {publishedEps.map((e) => (
                    <option key={e.episodeNumber} value={e.episodeNumber}>
                      Ep {e.episodeNumber}: {e.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            disabled={!canConfirm}
            onClick={() => confirm()}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
