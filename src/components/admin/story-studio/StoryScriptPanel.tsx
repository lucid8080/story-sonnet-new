'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE } from '@/lib/story-studio/constants';
import { mergeScriptPackageWithEpisodes } from '@/lib/story-studio/merge-script-package';
import type { GenerationRequest } from '@/lib/story-studio/types';
import { AddEpisodeModal } from './AddEpisodeModal';

type EpisodeRow = {
  id: string;
  sortOrder: number;
  title: string;
  scriptText: string;
  summary: string | null;
};

const field =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400';

export function StoryScriptPanel({
  draftId,
  draftTitle,
  request,
  episodes,
  scriptPackage,
  hasBrief,
  seriesSummaryHint,
  busy,
  saveDraftPatch,
  runTtsForEpisode,
  onSaveNotice,
}: {
  draftId: string;
  draftTitle: string;
  request: GenerationRequest;
  episodes: EpisodeRow[];
  scriptPackage: unknown;
  hasBrief: boolean;
  seriesSummaryHint?: string | null;
  busy: boolean;
  saveDraftPatch: (body: Record<string, unknown>) => Promise<unknown>;
  runTtsForEpisode: (draftEpisodeId: string) => Promise<void>;
  onSaveNotice: (msg: string) => void;
}) {
  const [showPkgJson, setShowPkgJson] = useState(false);
  const [addEpisodeOpen, setAddEpisodeOpen] = useState(false);
  const episodeKey = useMemo(
    () =>
      JSON.stringify(
        episodes.map((e) => ({
          id: e.id,
          title: e.title,
          scriptText: e.scriptText,
          summary: e.summary,
        }))
      ),
    [episodes]
  );
  const [rows, setRows] = useState<EpisodeRow[]>(() =>
    episodes.map((e, i) => ({
      ...e,
      sortOrder: e.sortOrder ?? i,
    }))
  );
  const [expandedEpisodeIds, setExpandedEpisodeIds] = useState<Set<string>>(
    () => new Set()
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [narratingEpisodeId, setNarratingEpisodeId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setRows(
      episodes.map((e, i) => ({
        ...e,
        sortOrder: e.sortOrder ?? i,
      }))
    );
    setSaveError(null);
    setExpandedEpisodeIds(new Set());
    // episodeKey fingerprints episode content; omit `episodes` to avoid resets on array ref churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when draft id or episode payload changes
  }, [draftId, episodeKey]);

  const pkgPretty = useMemo(() => {
    if (!scriptPackage) return '';
    try {
      return JSON.stringify(scriptPackage, null, 2);
    } catch {
      return String(scriptPackage);
    }
  }, [scriptPackage]);

  const saveScript = useCallback(async () => {
    setSaveError(null);
    const merged = mergeScriptPackageWithEpisodes(
      scriptPackage,
      rows.map((r) => ({
        title: r.title,
        scriptText: r.scriptText,
        summary: r.summary,
      }))
    );
    if (!merged.ok) {
      setSaveError(merged.message);
      return;
    }
    try {
      await saveDraftPatch({
        scriptPackage: merged.data,
        episodes: rows.map((r, i) => ({
          id: r.id,
          title: r.title,
          scriptText: r.scriptText,
          summary: r.summary?.trim() ? r.summary : null,
          sortOrder: i,
        })),
      });
      onSaveNotice('Script saved');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    }
  }, [rows, scriptPackage, saveDraftPatch, onSaveNotice]);

  const narrateEpisode = useCallback(
    async (episodeId: string) => {
      setNarratingEpisodeId(episodeId);
      try {
        await runTtsForEpisode(episodeId);
        onSaveNotice('Narration ready — open the Audio tab to play or download');
      } finally {
        setNarratingEpisodeId(null);
      }
    },
    [runTtsForEpisode, onSaveNotice]
  );

  const toggleEpisodeExpanded = useCallback((episodeId: string) => {
    setExpandedEpisodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(episodeId)) next.delete(episodeId);
      else next.add(episodeId);
      return next;
    });
  }, []);

  return (
    <>
      <AddEpisodeModal
        open={addEpisodeOpen}
        onClose={() => setAddEpisodeOpen(false)}
        draftId={draftId}
        draftTitle={draftTitle}
        request={request}
        episodes={episodes}
        scriptPackage={scriptPackage}
        hasBrief={hasBrief}
        seriesSummaryHint={seriesSummaryHint}
        saveDraftPatch={saveDraftPatch}
        runTtsForEpisode={runTtsForEpisode}
        onSaveNotice={onSaveNotice}
        busy={busy}
      />
      <div className="space-y-4">
      {rows.length === 0 ? (
        <>
          <p className="text-sm text-slate-600">
            No episodes yet. Add one with the dialog (LLM optional), or run
            Generate script on the main column. You can inspect script package
            JSON below if present.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddEpisodeOpen(true)}
              className="rounded-lg border border-sky-700 bg-white px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50 disabled:opacity-50"
            >
              Add episode…
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Dialog: directions, LLM generation, edit preview, save, then narrate
            this episode only.
          </p>
          {pkgPretty ? (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showPkgJson}
                  onChange={(e) => setShowPkgJson(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Show script package JSON
              </label>
              {showPkgJson && (
                <pre className="max-h-[480px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-sky-100 whitespace-pre-wrap">
                  {pkgPretty}
                </pre>
              )}
            </>
          ) : null}
        </>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveScript()}
                className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900 disabled:opacity-50"
              >
                Save script
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setAddEpisodeOpen(true)}
                className="rounded-lg border border-sky-700 bg-white px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50 disabled:opacity-50"
              >
                Add episode…
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showPkgJson}
                onChange={(e) => setShowPkgJson(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show script package JSON
            </label>
          </div>
          {saveError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {saveError}
            </p>
          )}
          {showPkgJson && pkgPretty && (
            <pre className="max-h-[240px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-sky-100 whitespace-pre-wrap">
              {pkgPretty}
            </pre>
          )}
          <ul className="max-h-[480px] space-y-6 overflow-y-auto pr-1">
            {rows.map((row, i) => {
              const n = row.scriptText.length;
              const over = n > STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE;
              const isExpanded = expandedEpisodeIds.has(row.id);
              return (
                <li
                  key={row.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleEpisodeExpanded(row.id)}
                      className="inline-flex items-center gap-2 text-xs font-bold uppercase text-slate-500"
                    >
                      <span>{isExpanded ? '▾' : '▸'}</span>
                      <span>Episode {i + 1}</span>
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy || narratingEpisodeId === row.id || !row.id
                      }
                      onClick={() => void narrateEpisode(row.id)}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {narratingEpisodeId === row.id
                        ? 'Narrating…'
                        : 'Narrate audio'}
                    </button>
                  </div>
                  {!isExpanded ? (
                    <p className="mt-2 text-xs text-slate-600">
                      {row.title || 'Untitled episode'} - {n} chars
                    </p>
                  ) : (
                    <>
                      <label className="mt-2 block">
                        <span className="text-xs font-bold text-slate-700">
                          Episode title
                        </span>
                        <input
                          className={field}
                          value={row.title}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRows((prev) =>
                              prev.map((r, j) =>
                                j === i ? { ...r, title: v } : r
                              )
                            );
                          }}
                        />
                      </label>
                      <label className="mt-3 block">
                        <span className="text-xs font-bold text-slate-700">
                          Episode summary
                        </span>
                        <textarea
                          rows={2}
                          className={field}
                          value={row.summary ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRows((prev) =>
                              prev.map((r, j) =>
                                j === i ? { ...r, summary: v || null } : r
                              )
                            );
                          }}
                          placeholder="Short blurb (must not copy the script verbatim)."
                        />
                      </label>
                      <label className="mt-3 block">
                        <span className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-bold text-slate-700">
                          <span>Script text</span>
                          <span
                            className={
                              over
                                ? 'font-mono text-rose-700'
                                : 'font-mono text-slate-500'
                            }
                          >
                            {n} / {STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE}
                          </span>
                        </span>
                        <textarea
                          rows={14}
                          maxLength={STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE}
                          className={`${field} font-mono text-[13px] leading-relaxed`}
                          value={row.scriptText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRows((prev) =>
                              prev.map((r, j) =>
                                j === i ? { ...r, scriptText: v } : r
                              )
                            );
                          }}
                        />
                      </label>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
    </>
  );
}
