'use client';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryFormState } from '@/lib/admin/story-form';
import { emptyEpisodeForm } from '@/lib/admin/story-form';
import { isValidStorySlug, normalizeStorySlug } from '@/lib/slug';

type TranscriptListItem = { key: string };

export default function StoryEpisodesSection({
  form,
  onChange,
}: {
  form: StoryFormState;
  onChange: (next: StoryFormState) => void;
}) {
  const field =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200';

  const reorder = (from: number, to: number) => {
    const eps = [...form.episodes];
    const [m] = eps.splice(from, 1);
    eps.splice(to, 0, m);
    onChange({
      ...form,
      episodes: eps.map((e, i) => ({ ...e, episodeNumber: i + 1 })),
    });
  };

  const updateEp = (index: number, patch: Partial<(typeof form.episodes)[0]>) => {
    const episodes = form.episodes.map((e, i) =>
      i === index ? { ...e, ...patch } : e
    );
    onChange({ ...form, episodes });
  };

  const removeEp = (index: number) => {
    if (form.episodes.length <= 1) return;
    if (!confirm('Remove this episode?')) return;
    const episodes = form.episodes
      .filter((_, i) => i !== index)
      .map((e, i) => ({ ...e, episodeNumber: i + 1 }));
    onChange({ ...form, episodes });
  };

  const addEp = () => {
    const n = form.episodes.length + 1;
    onChange({
      ...form,
      episodes: [...form.episodes, emptyEpisodeForm(`new-${crypto.randomUUID()}`, n)],
    });
  };

  const normalizedSlug = normalizeStorySlug(form.slug);
  const canScopeTranscriptsToStory = isValidStorySlug(normalizedSlug);

  const durationHint = (secondsRaw: string) => {
    const seconds = Number.parseInt(secondsRaw, 10);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return 'Duration is derived from the MP3 on save.';
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `Last derived duration: ${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Episodes
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Reorder with arrows. Slugs must be unique per story when set.
          </p>
        </div>
        <button
          type="button"
          onClick={addEp}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add episode
        </button>
      </div>

      <ul className="mt-4 space-y-4">
        {form.episodes.map((ep, index) => (
          <li
            key={ep.id}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-500">
                Episode {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => reorder(index, index - 1)}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === form.episodes.length - 1}
                  onClick={() => reorder(index, index + 1)}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove episode"
                  onClick={() => removeEp(index)}
                  className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Title
                </span>
                <input
                  className={field}
                  value={ep.title}
                  onChange={(e) => updateEp(index, { title: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600">
                  Slug
                </span>
                <input
                  className={field}
                  value={ep.slug}
                  onChange={(e) =>
                    updateEp(index, {
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600">
                  Label
                </span>
                <input
                  className={field}
                  value={ep.label}
                  onChange={(e) => updateEp(index, { label: e.target.value })}
                  placeholder="Episode 1"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Short summary
                </span>
                <textarea
                  rows={2}
                  className={field}
                  value={ep.summary}
                  onChange={(e) => updateEp(index, { summary: e.target.value })}
                />
              </label>
              <div className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Duration
                </span>
                <p className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-600">
                  {durationHint(ep.durationSeconds)}
                </p>
              </div>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Audio URL (legacy public MP3, optional)
                </span>
                <input
                  className={field}
                  value={ep.audioUrl}
                  onChange={(e) => updateEp(index, { audioUrl: e.target.value })}
                  placeholder="https://… or /audio/… when not using private R2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Private audio key (R2 object key, paywalled)
                </span>
                <input
                  className={field}
                  value={ep.audioStorageKey}
                  onChange={(e) =>
                    updateEp(index, { audioStorageKey: e.target.value })
                  }
                  placeholder="e.g. audio/story-slug/episode-1.mp3"
                />
              </label>
              <EpisodeTranscriptField
                episodeIndex={index}
                storySlug={normalizedSlug}
                canScopeToStory={canScopeTranscriptsToStory}
                transcriptStorageKey={ep.transcriptStorageKey}
                savedTranscriptLineCount={ep.savedTranscriptLineCount}
                fieldClass={field}
                onKeyChange={(key) =>
                  updateEp(index, { transcriptStorageKey: key })
                }
              />
              <div className="flex flex-wrap gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={ep.isPublished}
                    onChange={(e) =>
                      updateEp(index, { isPublished: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={ep.isPremium}
                    onChange={(e) =>
                      updateEp(index, { isPremium: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Premium
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={ep.isFreePreview}
                    onChange={(e) =>
                      updateEp(index, { isFreePreview: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Free preview (no subscription)
                </label>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EpisodeTranscriptField({
  episodeIndex,
  storySlug,
  canScopeToStory,
  transcriptStorageKey,
  savedTranscriptLineCount,
  fieldClass,
  onKeyChange,
}: {
  episodeIndex: number;
  storySlug: string;
  canScopeToStory: boolean;
  transcriptStorageKey: string;
  savedTranscriptLineCount: number;
  fieldClass: string;
  onKeyChange: (key: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scope, setScope] = useState<'all' | 'story'>('story');
  const [items, setItems] = useState<TranscriptListItem[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listPrefix = useMemo(() => {
    if (scope === 'story' && canScopeToStory) {
      return `audio/${storySlug}/`;
    }
    return 'audio/';
  }, [scope, canScopeToStory, storySlug]);

  useEffect(() => {
    if (scope === 'story' && !canScopeToStory) {
      setScope('all');
    }
  }, [scope, canScopeToStory]);

  const fetchPage = useCallback(
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
      const res = await fetch(`/api/admin/transcripts?${qs.toString()}`, {
        signal: opts.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: TranscriptListItem[];
        nextContinuationToken?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const pageItems = data.items ?? [];
      setNextToken(data.nextContinuationToken);
      if (opts.append) {
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.key));
          const merged = [...prev];
          for (const it of pageItems) {
            if (!seen.has(it.key)) {
              seen.add(it.key);
              merged.push(it);
            }
          }
          return merged;
        });
      } else {
        setItems(pageItems);
      }
    },
    [listPrefix]
  );

  useEffect(() => {
    if (!pickerOpen) return;
    const ac = new AbortController();
    let cancelled = false;
    setError(null);
    setLoading(true);
    setNextToken(undefined);
    setItems([]);
    fetchPage({ append: false, signal: ac.signal })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(
          e instanceof Error ? e.message : 'Failed to load transcript files'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [pickerOpen, listPrefix, fetchPage]);

  const onLoadMore = async () => {
    if (!nextToken || loadMoreLoading) return;
    setLoadMoreLoading(true);
    setError(null);
    try {
      await fetchPage({ continuationToken: nextToken, append: true });
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Failed to load more transcript files'
      );
    } finally {
      setLoadMoreLoading(false);
    }
  };

  const statusNote =
    transcriptStorageKey.trim() !== ''
      ? 'Will import from R2 on save.'
      : savedTranscriptLineCount > 0
        ? `${savedTranscriptLineCount} transcript lines saved.`
        : 'No transcript yet — pick a transcript file (.srt, .txt, .md) and save.';

  return (
    <div className="block sm:col-span-2">
      <span className="text-[11px] font-bold text-slate-600">
        Transcript file (private R2)
      </span>
      <input
        className={fieldClass}
        value={transcriptStorageKey}
        onChange={(e) => onKeyChange(e.target.value)}
        placeholder="e.g. audio/crown-of-curles/ep1-transcript.srt or ep1-script.txt"
      />
      <p className="mt-1 text-[11px] text-slate-500">{statusNote}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
        >
          {pickerOpen ? 'Hide transcript browser' : 'Browse transcript files in R2'}
        </button>
        <span className="text-[11px] text-slate-500">
          Object key only (not the bucket name). Same private bucket as audio.
        </span>
      </div>
      {pickerOpen ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Scope:
            </span>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                scope === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              All audio
            </button>
            <button
              type="button"
              disabled={!canScopeToStory}
              title={
                !canScopeToStory
                  ? 'Set a valid story slug to filter by this story’s folder'
                  : undefined
              }
              onClick={() => setScope('story')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                scope === 'story'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              This story (episode {episodeIndex + 1})
            </button>
            <code className="ml-auto max-w-full truncate rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
              {listPrefix}
            </code>
          </div>
          {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
          {loading ? (
            <p className="mt-3 text-xs text-slate-600">Loading transcript files…</p>
          ) : items.length === 0 && !error ? (
            <p className="mt-3 text-xs text-slate-600">
              No .srt / .txt / .md files in this prefix. Upload to R2 under{' '}
              <code className="rounded bg-slate-100 px-1">audio/&lt;slug&gt;/</code>{' '}
              or paste the key above.
            </p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {items.map((it) => {
                const selected =
                  transcriptStorageKey.trim() === it.key.trim();
                return (
                  <li key={it.key}>
                    <button
                      type="button"
                      onClick={() => onKeyChange(it.key)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${
                        selected
                          ? 'bg-violet-100 font-semibold text-violet-900 ring-1 ring-violet-300'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {it.key.replace(/^audio\//, '')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {nextToken ? (
            <button
              type="button"
              disabled={loadMoreLoading}
              onClick={() => void onLoadMore()}
              className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loadMoreLoading ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
