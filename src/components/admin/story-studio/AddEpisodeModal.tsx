'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE } from '@/lib/story-studio/constants';
import {
  firstEpisodePackageFromGenerated,
  mergeScriptPackageWithEpisodes,
} from '@/lib/story-studio/merge-script-package';
import type { ScriptPackagePayloadParsed } from '@/lib/story-studio/schemas/llm-output';
import type { GenerationRequest } from '@/lib/story-studio/types';

type DraftEpisode = {
  id: string;
  sortOrder: number;
  title: string;
  scriptText: string;
  summary: string | null;
};

const field =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400';

export function AddEpisodeModal({
  open,
  onClose,
  draftId,
  draftTitle,
  request,
  episodes,
  scriptPackage,
  hasBrief,
  seriesSummaryHint,
  saveDraftPatch,
  runTtsForEpisode,
  onSaveNotice,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  draftId: string;
  draftTitle: string;
  request: GenerationRequest;
  episodes: DraftEpisode[];
  scriptPackage: unknown;
  hasBrief: boolean;
  seriesSummaryHint?: string | null;
  saveDraftPatch: (body: Record<string, unknown>) => Promise<unknown>;
  runTtsForEpisode: (draftEpisodeId: string) => Promise<void>;
  onSaveNotice: (msg: string) => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [directions, setDirections] = useState('');
  /** null = append at end; number = insert after this episode index (0-based). */
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);

  const [previewTitle, setPreviewTitle] = useState('');
  const [previewSummary, setPreviewSummary] = useState('');
  const [previewScript, setPreviewScript] = useState('');

  const [genError, setGenError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [narrating, setNarrating] = useState(false);

  const [savedEpisodeId, setSavedEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (el) el.focus();
  }, [open]);

  // Reset when opening the dialog or switching drafts only — do NOT depend on
  // `episodes.length` or the list will update after save and wipe `savedEpisodeId`
  // before the user can click Narrate.
  useEffect(() => {
    if (!open) return;
    setGenError(null);
    setSaveError(null);
    setSavedEpisodeId(null);
    setPreviewTitle('');
    setPreviewSummary('');
    setPreviewScript('');
    setDirections('');
    setInsertAfterIndex(null);
  }, [open, draftId]);

  const handleGenerate = useCallback(async () => {
    if (!hasBrief) {
      setGenError('Generate a story brief first (main column → Generate brief).');
      return;
    }
    setGenError(null);
    setGenerating(true);
    try {
      const positionPayload =
        insertAfterIndex === null || episodes.length === 0
          ? ({ position: 'append' as const } as const)
          : {
              position: {
                insertAfterSortOrder: episodes[insertAfterIndex]?.sortOrder ?? 0,
              },
            };

      const res = await fetch('/api/admin/story-studio/generate/episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          directions,
          ...positionPayload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Generation failed');
      }
      const ep = json.episode as {
        title: string;
        summary: string;
        scriptText: string;
      };
      setPreviewTitle(ep.title);
      setPreviewSummary(ep.summary);
      setPreviewScript(ep.scriptText);
      setSavedEpisodeId(null);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [hasBrief, draftId, directions, insertAfterIndex, episodes]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    const title = previewTitle.trim();
    const summary = previewSummary.trim();
    const scriptText = previewScript.trim();
    if (!title || !summary || !scriptText) {
      setSaveError('Fill in title, summary, and script (or generate first).');
      return;
    }

    const newRow = {
      id: `new-${globalThis.crypto.randomUUID()}`,
      title,
      scriptText,
      summary,
    };

    let nextRows: {
      id: string;
      title: string;
      scriptText: string;
      summary: string | null;
    }[];

    if (insertAfterIndex === null) {
      nextRows = [
        ...episodes.map((e) => ({
          id: e.id,
          title: e.title,
          scriptText: e.scriptText,
          summary: e.summary,
        })),
        newRow,
      ];
    } else {
      const head = episodes.slice(0, insertAfterIndex + 1).map((e) => ({
        id: e.id,
        title: e.title,
        scriptText: e.scriptText,
        summary: e.summary,
      }));
      const tail = episodes.slice(insertAfterIndex + 1).map((e) => ({
        id: e.id,
        title: e.title,
        scriptText: e.scriptText,
        summary: e.summary,
      }));
      nextRows = [...head, newRow, ...tail];
    }

    const insertIndex = nextRows.findIndex((r) => r.id === newRow.id);

    setSaving(true);
    try {
      let scriptPayload: ScriptPackagePayloadParsed;
      if (!scriptPackage) {
        scriptPayload = firstEpisodePackageFromGenerated(
          {
            draftTitle,
            catalogAgeRange: request.catalogAgeRange,
            tagDensity: request.tagDensity,
            seriesSummaryHint,
          },
          { title, summary, scriptText }
        );
      } else {
        const merged = mergeScriptPackageWithEpisodes(
          scriptPackage,
          nextRows.map((r) => ({
            title: r.title,
            scriptText: r.scriptText,
            summary: r.summary,
          }))
        );
        if (!merged.ok) {
          setSaveError(merged.message);
          return;
        }
        scriptPayload = merged.data;
      }

      const raw = await saveDraftPatch({
        scriptPackage: scriptPayload,
        episodes: nextRows.map((r, i) => ({
          id: r.id,
          title: r.title,
          scriptText: r.scriptText,
          summary: r.summary?.trim() ? r.summary : null,
          sortOrder: i,
        })),
      });

      const d = raw as { episodes?: DraftEpisode[] } | undefined;

      if (d?.episodes?.length) {
        const sorted = [...d.episodes].sort(
          (a, b) => a.sortOrder - b.sortOrder
        );
        const added = sorted[insertIndex];
        if (added?.id) {
          setSavedEpisodeId(added.id);
        }
      }
      onSaveNotice('Episode saved');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [
    previewTitle,
    previewSummary,
    previewScript,
    insertAfterIndex,
    episodes,
    scriptPackage,
    draftTitle,
    request,
    seriesSummaryHint,
    saveDraftPatch,
    onSaveNotice,
  ]);

  const handleNarrate = useCallback(async () => {
    if (!savedEpisodeId) return;
    setNarrating(true);
    try {
      await runTtsForEpisode(savedEpisodeId);
      onSaveNotice('Narration ready — check the Audio tab');
    } finally {
      setNarrating(false);
    }
  }, [savedEpisodeId, runTtsForEpisode, onSaveNotice]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-ep-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
      >
        <h2
          id="add-ep-title"
          className="text-lg font-bold text-slate-900"
        >
          Add episode
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Optional directions, generate with the LLM, edit the preview, then save.
          You can narrate here or use the amber <strong>Narrate audio</strong>{' '}
          button on each episode in the Script tab.
        </p>

        <div className="mt-4 space-y-4">
          {episodes.length > 0 && (
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Placement</span>
              <select
                className={field}
                value={
                  insertAfterIndex === null ? 'append' : String(insertAfterIndex)
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'append') setInsertAfterIndex(null);
                  else setInsertAfterIndex(Number(v));
                }}
              >
                <option value="append">End of series</option>
                {episodes.map((ep, i) => (
                  <option key={ep.id} value={String(i)}>
                    After episode {i + 1}: {ep.title.slice(0, 48)}
                    {ep.title.length > 48 ? '…' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            <span className="font-semibold text-slate-700">
              Episode directions (optional)
            </span>
            <textarea
              rows={3}
              className={field}
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              placeholder="e.g. focus on the friendship beat, add a silly song moment…"
            />
          </label>

          {genError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {genError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || generating || !hasBrief}
              onClick={() => void handleGenerate()}
              className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate episode (LLM)'}
            </button>
            {!hasBrief && (
              <span className="self-center text-xs text-amber-800">
                Story brief required first.
              </span>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Episode preview (edit before save)
            </p>
            <label className="mt-2 block">
              <span className="text-xs font-bold text-slate-700">
                Episode title
              </span>
              <input
                className={field}
                value={previewTitle}
                onChange={(e) => setPreviewTitle(e.target.value)}
              />
            </label>
            <label className="mt-2 block">
              <span className="text-xs font-bold text-slate-700">Summary</span>
              <textarea
                rows={2}
                className={field}
                value={previewSummary}
                onChange={(e) => setPreviewSummary(e.target.value)}
              />
            </label>
            <label className="mt-2 block">
              <span className="flex justify-between text-xs font-bold text-slate-700">
                <span>Script</span>
                <span className="font-mono text-slate-500">
                  {previewScript.length} / {STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE}
                </span>
              </span>
              <textarea
                rows={12}
                maxLength={STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE}
                className={`${field} font-mono text-[13px]`}
                value={previewScript}
                onChange={(e) => setPreviewScript(e.target.value)}
              />
            </label>
          </div>

          {saveError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {saveError}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={busy || saving}
              onClick={() => void handleSave()}
              className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save episode to draft'}
            </button>
            <button
              type="button"
              disabled={busy || narrating || !savedEpisodeId}
              onClick={() => void handleNarrate()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {narrating ? 'Narrating…' : 'Narrate audio'}
            </button>
            {!savedEpisodeId && (
              <span className="self-center text-xs text-slate-500">
                After save, narrate here or on the Script tab (per episode).
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
