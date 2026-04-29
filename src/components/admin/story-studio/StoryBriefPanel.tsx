'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  parseJsonToBrief,
  type BriefPayloadParsed,
} from '@/lib/story-studio/schemas/llm-output';
import type { GenerationRequest } from '@/lib/story-studio/types';
import {
  AGE_FILTER_OPTIONS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
} from '@/constants/storyFilters';
import { draftSlugFromTitle } from '@/lib/story-studio/draft-slug-from-title';

const field =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400';

function defaultBrief(
  seriesTitle: string,
  req: GenerationRequest
): BriefPayloadParsed {
  const t = seriesTitle.trim() || 'Untitled draft';
  return {
    seriesTitle: t,
    summary: 'Add a short summary for cards and the library.',
    logline: '',
    characters: ['Main character'],
    settingSketch: '',
    suggestedGenre: req.catalogGenre ?? null,
    suggestedMood: req.catalogMood ?? null,
    ageRange: req.catalogAgeRange,
    episodeOutline: [],
    coverArtPrompt: '',
    musicPrompt: '',
    estimatedRuntimeMinutes: 3,
    safetyNotes: '',
  };
}

function briefFromDraft(
  brief: unknown,
  seriesTitle: string,
  req: GenerationRequest
): BriefPayloadParsed {
  if (brief == null) return defaultBrief(seriesTitle, req);
  const parsed = parseJsonToBrief(JSON.stringify(brief));
  if (parsed.success) return parsed.data;
  return defaultBrief(seriesTitle, req);
}

export function StoryBriefPanel({
  draftId,
  draftSeriesTitle,
  brief,
  request,
  busy,
  saveDraftPatch,
  onSaveNotice,
}: {
  draftId: string;
  draftSeriesTitle: string;
  brief: unknown;
  request: GenerationRequest;
  busy: boolean;
  saveDraftPatch: (body: Record<string, unknown>) => Promise<unknown>;
  onSaveNotice: (msg: string) => void;
}) {
  const [showJson, setShowJson] = useState(false);
  const briefJsonKey = useMemo(
    () => JSON.stringify(brief ?? null),
    [brief]
  );
  const [form, setForm] = useState<BriefPayloadParsed>(() =>
    briefFromDraft(brief, draftSeriesTitle, request)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setForm(briefFromDraft(brief, draftSeriesTitle, request));
    setSaveError(null);
    // briefJsonKey fingerprints `brief` content; omit `request` so debounced request-only saves do not wipe unsaved brief edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when draft id, brief JSON, or saved title changes
  }, [draftId, briefJsonKey, draftSeriesTitle]);

  const briefJsonPretty = useMemo(
    () => JSON.stringify(form, null, 2),
    [form]
  );

  const saveBrief = useCallback(async () => {
    setSaveError(null);
    const normalized: BriefPayloadParsed = {
      ...form,
      characters: form.characters.map((c) => c.trim()).filter(Boolean),
    };
    if (!normalized.characters.length) {
      setSaveError('Add at least one character (non-empty line).');
      return;
    }
    const parsed = parseJsonToBrief(JSON.stringify(normalized));
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const fieldMsg = Object.entries(flat.fieldErrors)
        .flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((m) => `${k}: ${m}`) : []
        )
        .slice(0, 8)
        .join('; ');
      const msg =
        fieldMsg ||
        flat.formErrors.join('; ') ||
        'Brief validation failed.';
      setSaveError(msg);
      return;
    }
    try {
      const st = parsed.data.seriesTitle.trim();
      if (st.length > 0) {
        await saveDraftPatch({
          brief: parsed.data,
          seriesTitle: st,
          slug: draftSlugFromTitle(st),
        });
      } else {
        await saveDraftPatch({ brief: parsed.data });
      }
      onSaveNotice('Brief saved');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    }
  }, [form, saveDraftPatch, onSaveNotice]);

  const dirtyCharacters = !form.characters.some((c) => c.trim().length > 0);
  const setCharacter = (index: number, value: string) => {
    setForm((f) => {
      const next = [...f.characters];
      next[index] = value;
      return { ...f, characters: next };
    });
  };
  const addCharacter = () => {
    setForm((f) => ({ ...f, characters: [...f.characters, ''] }));
  };
  const removeCharacter = (index: number) => {
    setForm((f) => ({
      ...f,
      characters: f.characters.filter((_, i) => i !== index),
    }));
  };

  const setOutlineBeat = (
    index: number,
    key: 'title' | 'beat',
    value: string
  ) => {
    setForm((f) => {
      const next = f.episodeOutline.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      );
      return { ...f, episodeOutline: next };
    });
  };
  const addOutlineRow = () => {
    setForm((f) => ({
      ...f,
      episodeOutline: [...f.episodeOutline, { title: '', beat: '' }],
    }));
  };
  const removeOutlineRow = (index: number) => {
    setForm((f) => ({
      ...f,
      episodeOutline: f.episodeOutline.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveBrief()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          Save brief
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showJson}
            onChange={(e) => setShowJson(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show brief JSON
        </label>
      </div>
      {saveError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {saveError}
        </p>
      )}
      {dirtyCharacters && (
        <p className="text-sm text-amber-800">
          Add at least one character line before saving.
        </p>
      )}

      {showJson && (
        <pre className="max-h-[280px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-100">
          {briefJsonPretty}
        </pre>
      )}

      <div className="max-h-[560px] overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">
              Series title
            </span>
            <input
              className={field}
              value={form.seriesTitle}
              onChange={(e) =>
                setForm({ ...form, seriesTitle: e.target.value })
              }
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">Summary</span>
            <textarea
              rows={3}
              className={field}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">Logline</span>
            <textarea
              rows={2}
              className={field}
              value={form.logline}
              onChange={(e) => setForm({ ...form, logline: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Characters
            </span>
            <button
              type="button"
              onClick={addCharacter}
              className="text-xs font-semibold text-violet-700 hover:underline"
            >
              + Add character
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {form.characters.map((c, i) => (
              <li key={i} className="flex gap-2">
                <input
                  className={field}
                  value={c}
                  onChange={(e) => setCharacter(i, e.target.value)}
                  placeholder={`Character ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeCharacter(i)}
                  className="shrink-0 rounded-lg border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-bold text-slate-700">
            Setting sketch
          </span>
          <textarea
            rows={3}
            className={field}
            value={form.settingSketch}
            onChange={(e) =>
              setForm({ ...form, settingSketch: e.target.value })
            }
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">
              Suggested genre
            </span>
            <select
              className={field}
              value={form.suggestedGenre ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  suggestedGenre:
                    e.target.value === ''
                      ? null
                      : (e.target.value as BriefPayloadParsed['suggestedGenre']),
                })
              }
            >
              <option value="">—</option>
              {GENRE_FILTER_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">
              Suggested mood
            </span>
            <select
              className={field}
              value={form.suggestedMood ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  suggestedMood:
                    e.target.value === ''
                      ? null
                      : (e.target.value as BriefPayloadParsed['suggestedMood']),
                })
              }
            >
              <option value="">—</option>
              {MOOD_FILTER_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Age range</span>
            <select
              className={field}
              value={form.ageRange}
              onChange={(e) =>
                setForm({
                  ...form,
                  ageRange: e.target.value as BriefPayloadParsed['ageRange'],
                })
              }
            >
              {AGE_FILTER_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Episode outline
            </span>
            <button
              type="button"
              onClick={addOutlineRow}
              className="text-xs font-semibold text-violet-700 hover:underline"
            >
              + Add beat
            </button>
          </div>
          <ul className="mt-2 space-y-3">
            {form.episodeOutline.map((row, i) => (
              <li
                key={i}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
              >
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeOutlineRow(i)}
                    className="text-xs text-slate-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  className={field}
                  value={row.title}
                  onChange={(e) =>
                    setOutlineBeat(i, 'title', e.target.value)
                  }
                  placeholder="Episode title"
                />
                <textarea
                  rows={2}
                  className={`${field} mt-2`}
                  value={row.beat}
                  onChange={(e) =>
                    setOutlineBeat(i, 'beat', e.target.value)
                  }
                  placeholder="Beat / outline"
                />
              </li>
            ))}
          </ul>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-bold text-slate-700">
            Cover art prompt
          </span>
          <textarea
            rows={3}
            className={field}
            value={form.coverArtPrompt}
            onChange={(e) =>
              setForm({ ...form, coverArtPrompt: e.target.value })
            }
          />
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-bold text-slate-700">
            Music prompt
          </span>
          <textarea
            rows={2}
            className={field}
            value={form.musicPrompt}
            onChange={(e) =>
              setForm({ ...form, musicPrompt: e.target.value })
            }
          />
        </label>

        <label className="mt-4 block sm:max-w-xs">
          <span className="text-xs font-bold text-slate-700">
            Estimated runtime (minutes, 1–5)
          </span>
          <input
            type="number"
            min={1}
            max={5}
            className={field}
            value={form.estimatedRuntimeMinutes}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) return;
              setForm({
                ...form,
                estimatedRuntimeMinutes: Math.min(5, Math.max(1, n)),
              });
            }}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-bold text-slate-700">Safety notes</span>
          <textarea
            rows={2}
            className={field}
            value={form.safetyNotes}
            onChange={(e) =>
              setForm({ ...form, safetyNotes: e.target.value })
            }
          />
        </label>
      </div>
    </div>
  );
}
