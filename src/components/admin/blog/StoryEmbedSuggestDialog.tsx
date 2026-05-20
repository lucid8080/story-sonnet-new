'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';
import type { StoryEmbedSuggestion } from '@/lib/blog/suggest-story-embeds';
import { storyEmbedAttrsFromSuggestion } from '@/lib/blog/suggest-story-embeds';

export type BlogPostEmbedContext = {
  title: string;
  excerpt: string;
  tagNames: string[];
  metaKeywords: string | null;
  getContentHtml: () => string;
};

export function StoryEmbedSuggestDialog({
  open,
  onClose,
  postContext,
  onInsertMany,
}: {
  open: boolean;
  onClose: () => void;
  postContext: BlogPostEmbedContext;
  onInsertMany: (attrs: StoryEmbedAttrs[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<StoryEmbedSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCover, setShowCover] = useState(true);
  const [includePreviewAudio, setIncludePreviewAudio] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    const ctx = postContext;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/blog/embed-story/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ctx.title,
          excerpt: ctx.excerpt,
          contentHtml: ctx.getContentHtml(),
          tagNames: ctx.tagNames,
          metaKeywords: ctx.metaKeywords,
          limit: 8,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        suggestions?: StoryEmbedSuggestion[];
        error?: string;
      };
      if (!res.ok || !data.ok || !Array.isArray(data.suggestions)) {
        setError(data.error ?? 'Could not load suggestions');
        setSuggestions([]);
        return;
      }
      setSuggestions(data.suggestions);
      setSelected(new Set(data.suggestions.map((s) => s.slug)));
    } catch {
      setError('Could not load suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
    // Snapshot postContext when Refresh/open runs — avoids refetch on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- postContext read at invoke time
  }, []);

  useEffect(() => {
    if (!open) return;
    setSuggestions([]);
    setSelected(new Set());
    setShowCover(true);
    setIncludePreviewAudio(true);
    setError(null);
    void fetchSuggestions();
  }, [open, fetchSuggestions]);

  const toggleSlug = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const insertSelected = () => {
    const audioMode = includePreviewAudio ? 'preview' : 'none';
    const attrs = suggestions
      .filter((s) => selected.has(s.slug))
      .map((s) =>
        storyEmbedAttrsFromSuggestion(s, {
          showCover,
          audioMode,
        })
      )
      .filter((a) => a.showCover || a.audioMode !== 'none');

    if (attrs.length === 0) return;
    onInsertMany(attrs);
    onClose();
  };

  if (!open) return null;

  const selectedCount = suggestions.filter((s) => selected.has(s.slug)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">
          Suggest relevant stories
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Ranked from your post title, excerpt, tags, and body. Stories already
          embedded are skipped.
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showCover}
              onChange={(e) => setShowCover(e.target.checked)}
            />
            <span>Include cover (links to story)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includePreviewAudio}
              onChange={(e) => setIncludePreviewAudio(e.target.checked)}
            />
            <span>Include sample audio when available</span>
          </label>
        </div>

        {loading && (
          <p className="mt-4 text-sm text-slate-500">Finding relevant stories…</p>
        )}

        {error && !loading && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && suggestions.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            No matching stories found. Try adding tags or keywords, or embed
            manually.
          </p>
        )}

        {!loading && suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            {suggestions.map((s) => {
              const checked = selected.has(s.slug);
              return (
                <label
                  key={s.slug}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                    checked
                      ? 'border-violet-400 bg-violet-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    checked={checked}
                    onChange={() => toggleSlug(s.slug)}
                  />
                  {s.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.coverUrl}
                      alt=""
                      className="h-20 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">
                      No cover
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-900">{s.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {s.matchReason}
                      {s.hasFreePreview && includePreviewAudio
                        ? ' · sample audio'
                        : ''}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                      {s.slug}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
            disabled={loading}
            onClick={() => void fetchSuggestions()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            disabled={
              loading ||
              selectedCount === 0 ||
              (!showCover && !includePreviewAudio)
            }
            onClick={insertSelected}
          >
            Insert {selectedCount > 0 ? selectedCount : ''} embed
            {selectedCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
