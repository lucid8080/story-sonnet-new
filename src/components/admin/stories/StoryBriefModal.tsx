'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { StoryBriefPanel } from '@/components/admin/story-studio/StoryBriefPanel';
import {
  defaultGenerationRequest,
  parseStoredGenerationRequest,
} from '@/lib/story-studio/normalize-request';
import type { GenerationRequest } from '@/lib/story-studio/types';

type EnsureDraftResponse = {
  ok?: boolean;
  error?: string;
  created?: boolean;
  draftId?: string;
  seriesTitle?: string;
  brief?: unknown;
  request?: unknown;
};

export default function StoryBriefModal({
  storyId,
  open,
  onClose,
}: {
  storyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [seriesTitle, setSeriesTitle] = useState('');
  const [brief, setBrief] = useState<unknown>(null);
  const [request, setRequest] = useState<GenerationRequest>(
    defaultGenerationRequest()
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotice(null);
    setDraftId(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/stories/${encodeURIComponent(storyId)}/studio-draft`,
          { method: 'POST' }
        );
        const data = (await res.json()) as EnsureDraftResponse;
        if (cancelled) return;
        if (!res.ok || !data.draftId) {
          setLoadError(data.error || `Failed to open brief (${res.status})`);
          return;
        }
        setDraftId(data.draftId);
        setSeriesTitle(data.seriesTitle ?? '');
        setBrief(data.brief ?? null);
        setRequest(
          data.request != null
            ? parseStoredGenerationRequest(data.request)
            : defaultGenerationRequest()
        );
        if (data.created) {
          setNotice('Created a linked Story Studio draft for this series.');
        }
      } catch {
        if (!cancelled) setLoadError('Network error loading Story Brief.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, storyId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const saveDraftPatch = useCallback(
    async (body: Record<string, unknown>) => {
      if (!draftId) throw new Error('No draft loaded');
      setBusy(true);
      try {
        const res = await fetch(
          `/api/admin/story-studio/drafts/${draftId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        const json = (await res.json()) as {
          error?: string;
          draft?: {
            brief?: unknown;
            seriesTitle?: string;
            request?: GenerationRequest;
          };
        };
        if (!res.ok) {
          throw new Error(json.error || 'Save failed');
        }
        if (json.draft) {
          if ('brief' in body) setBrief(json.draft.brief ?? null);
          if (json.draft.seriesTitle != null) {
            setSeriesTitle(json.draft.seriesTitle);
          }
          if (json.draft.request) setRequest(json.draft.request);
        }
        return json;
      } finally {
        setBusy(false);
      }
    },
    [draftId]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-brief-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <h2
              id="story-brief-modal-title"
              className="text-lg font-black text-slate-900"
            >
              Story Brief
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Shared with Story Studio
              {draftId ? (
                <>
                  {' '}
                  ·{' '}
                  <Link
                    href={`/admin/story-studio?draft=${encodeURIComponent(draftId)}`}
                    className="font-semibold text-violet-700 hover:underline"
                  >
                    Open in Story Studio
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <p className="text-sm text-slate-600">Loading Story Brief…</p>
          ) : null}
          {loadError ? (
            <p
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              role="alert"
            >
              {loadError}
            </p>
          ) : null}
          {notice ? (
            <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {notice}
            </p>
          ) : null}
          {draftId && !loading && !loadError ? (
            <StoryBriefPanel
              draftId={draftId}
              draftSeriesTitle={seriesTitle}
              brief={brief}
              request={request}
              busy={busy}
              saveDraftPatch={saveDraftPatch}
              onSaveNotice={(msg) => setNotice(msg)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
