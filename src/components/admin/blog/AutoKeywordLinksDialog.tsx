'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BlogPostEmbedContext } from '@/components/admin/blog/StoryEmbedSuggestDialog';

export type AutoLinkPreviewItem = {
  phrase: string;
  href: string;
  kind: 'blog' | 'story' | 'external';
  label: string;
  score: number;
};

export type AppliedAutoLink = {
  phrase: string;
  href: string;
  kind: 'blog' | 'story' | 'external';
  label: string;
  count: number;
};

export function AutoKeywordLinksDialog({
  open,
  onClose,
  postContext,
  currentPostSlug,
  onApplyHtml,
}: {
  open: boolean;
  onClose: () => void;
  postContext: BlogPostEmbedContext;
  currentPostSlug: string;
  onApplyHtml: (html: string, applied: AppliedAutoLink[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AutoLinkPreviewItem[]>([]);
  const [targetCount, setTargetCount] = useState(0);
  const [includeBlog, setIncludeBlog] = useState(true);
  const [includeStories, setIncludeStories] = useState(true);
  const [includeExternal, setIncludeExternal] = useState(true);
  const [maxLinks, setMaxLinks] = useState(12);

  const fetchPreview = useCallback(async () => {
    const ctx = postContext;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/blog/auto-links/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ctx.title,
          excerpt: ctx.excerpt,
          contentHtml: ctx.getContentHtml(),
          tagNames: ctx.tagNames,
          metaKeywords: ctx.metaKeywords,
          currentPostSlug,
          dryRun: true,
          includeBlog,
          includeStories,
          includeExternal,
          maxLinks,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        preview?: AutoLinkPreviewItem[];
        targetCount?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not load link suggestions');
        setPreview([]);
        setTargetCount(0);
        return;
      }
      setPreview(data.preview ?? []);
      setTargetCount(data.targetCount ?? 0);
    } catch {
      setError('Could not load link suggestions');
      setPreview([]);
      setTargetCount(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot at invoke
  }, [currentPostSlug, includeBlog, includeStories, includeExternal, maxLinks]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void fetchPreview();
  }, [open, fetchPreview]);

  const applyLinks = async () => {
    const ctx = postContext;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/blog/auto-links/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ctx.title,
          excerpt: ctx.excerpt,
          contentHtml: ctx.getContentHtml(),
          tagNames: ctx.tagNames,
          metaKeywords: ctx.metaKeywords,
          currentPostSlug,
          dryRun: false,
          includeBlog,
          includeStories,
          includeExternal,
          maxLinks,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        contentHtml?: string;
        applied?: AppliedAutoLink[];
        error?: string;
      };
      if (!res.ok || !data.ok || typeof data.contentHtml !== 'string') {
        setError(data.error ?? 'Could not apply links');
        return;
      }
      onApplyHtml(data.contentHtml, data.applied ?? []);
      onClose();
    } catch {
      setError('Could not apply links');
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-links-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="auto-links-title" className="text-lg font-bold text-slate-900">
          Auto-link keywords
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Links the first mention of matching phrases to published blog posts,
          stories, and configured external URLs. Skips headings and existing
          links.
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeBlog}
              onChange={(e) => setIncludeBlog(e.target.checked)}
            />
            Blog posts
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeStories}
              onChange={(e) => setIncludeStories(e.target.checked)}
            />
            Stories
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeExternal}
              onChange={(e) => setIncludeExternal(e.target.checked)}
            />
            External rules
          </label>
        </div>

        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Max links</span>
          <input
            type="number"
            min={1}
            max={30}
            className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1"
            value={maxLinks}
            onChange={(e) =>
              setMaxLinks(Math.min(30, Math.max(1, Number(e.target.value) || 12)))
            }
          />
        </label>

        {loading && (
          <p className="mt-4 text-sm text-slate-500">Scanning content…</p>
        )}
        {error && !loading && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && preview.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            No matching phrases found in the body. Try adding story or blog
            titles in the text, or add external rules via the AI generator panel
            (blog admin settings).
          </p>
        )}

        {!loading && preview.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Will link ({targetCount} match{targetCount === 1 ? '' : 'es'})
            </p>
            <ul className="space-y-2">
              {preview.map((item) => (
                <li
                  key={`${item.kind}-${item.href}-${item.phrase}`}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900">
                    “{item.phrase}”
                  </span>
                  <span className="mx-1 text-slate-400">→</span>
                  <span className="text-slate-600">{item.label}</span>
                  <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                    {item.kind}
                  </span>
                </li>
              ))}
            </ul>
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
            disabled={loading || applying}
            onClick={() => void fetchPreview()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            disabled={loading || applying || preview.length === 0}
            onClick={() => void applyLinks()}
          >
            {applying ? 'Applying…' : 'Apply links'}
          </button>
        </div>
      </div>
    </div>
  );
}
