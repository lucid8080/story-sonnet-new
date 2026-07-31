'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  parseJsonToBrief,
  type BriefPayloadParsed,
  type BriefReferenceGuideParsed,
} from '@/lib/story-studio/schemas/llm-output';
import type { GenerationRequest } from '@/lib/story-studio/types';
import {
  AGE_FILTER_OPTIONS,
  GENRE_FILTER_OPTIONS,
  MOOD_FILTER_OPTIONS,
} from '@/constants/storyFilters';
import { STORY_STUDIO_MAX_ESTIMATED_RUNTIME_MINUTES } from '@/lib/story-studio/constants';
import { draftSlugFromTitle } from '@/lib/story-studio/draft-slug-from-title';

const field =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400';

function emptyGuide(): BriefReferenceGuideParsed {
  return { name: '', notes: '', imageUrl: null };
}

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
    characterGuides: [],
    sceneGuides: [],
  };
}

function briefFromDraft(
  brief: unknown,
  seriesTitle: string,
  req: GenerationRequest
): BriefPayloadParsed {
  if (brief == null) return defaultBrief(seriesTitle, req);
  const parsed = parseJsonToBrief(JSON.stringify(brief));
  if (parsed.success) {
    return {
      ...parsed.data,
      characterGuides: parsed.data.characterGuides ?? [],
      sceneGuides: parsed.data.sceneGuides ?? [],
    };
  }
  return defaultBrief(seriesTitle, req);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function briefToPlainText(brief: BriefPayloadParsed): string {
  const lines: string[] = [];
  const section = (title: string) => {
    lines.push('');
    lines.push(`## ${title}`);
    lines.push('');
  };

  lines.push(`# Story Brief: ${brief.seriesTitle}`);
  section('Summary');
  lines.push(brief.summary || '(none)');
  section('Logline');
  lines.push(brief.logline || '(none)');
  section('Characters');
  if (brief.characters.length === 0) {
    lines.push('(none)');
  } else {
    brief.characters.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  }
  section('Setting sketch');
  lines.push(brief.settingSketch || '(none)');
  section('Catalog hints');
  lines.push(`Genre: ${brief.suggestedGenre ?? '—'}`);
  lines.push(`Mood: ${brief.suggestedMood ?? '—'}`);
  lines.push(`Age range: ${brief.ageRange}`);
  lines.push(
    `Estimated runtime (minutes): ${brief.estimatedRuntimeMinutes}`
  );
  section('Episode outline');
  if (brief.episodeOutline.length === 0) {
    lines.push('(none)');
  } else {
    brief.episodeOutline.forEach((row, i) => {
      lines.push(`${i + 1}. ${row.title || '(untitled)'}`);
      lines.push(`   ${row.beat || '(no beat)'}`);
    });
  }
  section('Cover art prompt');
  lines.push(brief.coverArtPrompt || '(none)');
  section('Music prompt');
  lines.push(brief.musicPrompt || '(none)');
  section('Safety notes');
  lines.push(brief.safetyNotes || '(none)');
  section('Character reference guides');
  const charGuides = brief.characterGuides ?? [];
  if (charGuides.length === 0) {
    lines.push('(none)');
  } else {
    charGuides.forEach((g, i) => {
      lines.push(`${i + 1}. ${g.name || '(unnamed)'}`);
      lines.push(`   Notes: ${g.notes || '(none)'}`);
      lines.push(`   Image: ${g.imageUrl || '(none)'}`);
    });
  }
  section('Scene guides');
  const sceneGuides = brief.sceneGuides ?? [];
  if (sceneGuides.length === 0) {
    lines.push('(none)');
  } else {
    sceneGuides.forEach((g, i) => {
      lines.push(`${i + 1}. ${g.name || '(unnamed)'}`);
      lines.push(`   Notes: ${g.notes || '(none)'}`);
      lines.push(`   Image: ${g.imageUrl || '(none)'}`);
    });
  }
  lines.push('');
  return lines.join('\n');
}

function ReferenceGuidesEditor({
  title,
  guides,
  draftId,
  busy,
  uploadingIndex,
  onChange,
  onUpload,
}: {
  title: string;
  guides: BriefReferenceGuideParsed[];
  draftId: string;
  busy: boolean;
  uploadingIndex: number | null;
  onChange: (next: BriefReferenceGuideParsed[]) => void;
  onUpload: (index: number, file: File) => void;
}) {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setGuide = (
    index: number,
    patch: Partial<BriefReferenceGuideParsed>
  ) => {
    onChange(
      guides.map((g, i) => (i === index ? { ...g, ...patch } : g))
    );
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">{title}</span>
        <button
          type="button"
          onClick={() => onChange([...guides, emptyGuide()])}
          className="text-xs font-semibold text-violet-700 hover:underline"
        >
          + Add
        </button>
      </div>
      <ul className="mt-2 space-y-3">
        {guides.map((g, i) => (
          <li
            key={i}
            className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  onChange(guides.filter((_, idx) => idx !== i))
                }
                className="text-xs text-slate-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <input
              className={field}
              value={g.name}
              onChange={(e) => setGuide(i, { name: e.target.value })}
              placeholder="Name / label"
            />
            <textarea
              rows={2}
              className={`${field} mt-2`}
              value={g.notes}
              onChange={(e) => setGuide(i, { notes: e.target.value })}
              placeholder="Short notes"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {g.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded R2 URL
                <img
                  src={g.imageUrl}
                  alt={g.name || 'Reference'}
                  className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-[10px] text-slate-400">
                  No image
                </div>
              )}
              <div className="flex flex-col gap-1">
                <input
                  ref={(el) => {
                    fileInputRefs.current[i] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) onUpload(i, file);
                  }}
                />
                <button
                  type="button"
                  disabled={busy || uploadingIndex === i || !draftId}
                  onClick={() => fileInputRefs.current[i]?.click()}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {uploadingIndex === i ? 'Uploading…' : 'Upload image'}
                </button>
                {g.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setGuide(i, { imageUrl: null })}
                    className="text-left text-xs text-slate-500 hover:underline"
                  >
                    Clear image
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {guides.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          Optional: attach reference images with short notes.
        </p>
      ) : null}
    </div>
  );
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
  const briefJsonKey = useMemo(
    () => JSON.stringify(brief ?? null),
    [brief]
  );
  const [form, setForm] = useState<BriefPayloadParsed>(() =>
    briefFromDraft(brief, draftSeriesTitle, request)
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [charUploadIndex, setCharUploadIndex] = useState<number | null>(
    null
  );
  const [sceneUploadIndex, setSceneUploadIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    setForm(briefFromDraft(brief, draftSeriesTitle, request));
    setSaveError(null);
    // briefJsonKey fingerprints `brief` content; omit `request` so debounced request-only saves do not wipe unsaved brief edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when draft id, brief JSON, or saved title changes
  }, [draftId, briefJsonKey, draftSeriesTitle]);

  const saveBrief = useCallback(async () => {
    setSaveError(null);
    const normalized: BriefPayloadParsed = {
      ...form,
      characters: form.characters.map((c) => c.trim()).filter(Boolean),
      characterGuides: (form.characterGuides ?? []).map((g) => ({
        name: g.name.trim(),
        notes: g.notes.trim(),
        imageUrl: g.imageUrl?.trim() || null,
      })),
      sceneGuides: (form.sceneGuides ?? []).map((g) => ({
        name: g.name.trim(),
        notes: g.notes.trim(),
        imageUrl: g.imageUrl?.trim() || null,
      })),
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

  const downloadJson = useCallback(() => {
    const slug = draftSlugFromTitle(form.seriesTitle || 'story-brief');
    downloadBlob(
      `${slug}-brief.json`,
      new Blob([JSON.stringify(form, null, 2)], {
        type: 'application/json',
      })
    );
  }, [form]);

  const downloadText = useCallback(() => {
    const slug = draftSlugFromTitle(form.seriesTitle || 'story-brief');
    downloadBlob(
      `${slug}-brief.txt`,
      new Blob([briefToPlainText(form)], { type: 'text/plain;charset=utf-8' })
    );
  }, [form]);

  const uploadGuideImage = useCallback(
    async (
      kind: 'characterGuides' | 'sceneGuides',
      index: number,
      file: File
    ) => {
      setSaveError(null);
      if (kind === 'characterGuides') setCharUploadIndex(index);
      else setSceneUploadIndex(index);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('assetKind', 'brief_reference');
        fd.append('draftId', draftId);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = (await res.json()) as {
          error?: string;
          fileUrl?: string;
        };
        if (!res.ok || !data.fileUrl) {
          throw new Error(data.error || `Upload failed (${res.status})`);
        }
        setForm((f) => {
          const list = [...(f[kind] ?? [])];
          if (!list[index]) return f;
          list[index] = { ...list[index], imageUrl: data.fileUrl! };
          return { ...f, [kind]: list };
        });
        onSaveNotice('Reference image uploaded (save brief to keep)');
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        if (kind === 'characterGuides') setCharUploadIndex(null);
        else setSceneUploadIndex(null);
      }
    },
    [draftId, onSaveNotice]
  );

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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadJson}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={downloadText}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Download text
          </button>
        </div>
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

        <ReferenceGuidesEditor
          title="Character reference guides"
          guides={form.characterGuides ?? []}
          draftId={draftId}
          busy={busy}
          uploadingIndex={charUploadIndex}
          onChange={(characterGuides) =>
            setForm((f) => ({ ...f, characterGuides }))
          }
          onUpload={(index, file) =>
            void uploadGuideImage('characterGuides', index, file)
          }
        />

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

        <ReferenceGuidesEditor
          title="Scene guides"
          guides={form.sceneGuides ?? []}
          draftId={draftId}
          busy={busy}
          uploadingIndex={sceneUploadIndex}
          onChange={(sceneGuides) => setForm((f) => ({ ...f, sceneGuides }))}
          onUpload={(index, file) =>
            void uploadGuideImage('sceneGuides', index, file)
          }
        />

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
            Estimated runtime (minutes, 1–
            {STORY_STUDIO_MAX_ESTIMATED_RUNTIME_MINUTES})
          </span>
          <input
            type="number"
            min={1}
            max={STORY_STUDIO_MAX_ESTIMATED_RUNTIME_MINUTES}
            className={field}
            value={form.estimatedRuntimeMinutes}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) return;
              setForm({
                ...form,
                estimatedRuntimeMinutes: Math.min(
                  STORY_STUDIO_MAX_ESTIMATED_RUNTIME_MINUTES,
                  Math.max(1, n)
                ),
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
