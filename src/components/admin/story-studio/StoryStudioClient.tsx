'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildDraftCoverImagePrompt } from '@/lib/story-studio/prompt-builder';
import type { GenerationRequest } from '@/lib/story-studio/types';
import { GenerationStatusBar } from './GenerationStatusBar';
import { PreviewTabs, type PreviewTabId } from './PreviewTabs';
import { SelectionChips, ToggleRow } from './SelectionChips';

type SerializedDraft = {
  id: string;
  title: string;
  slug: string;
  mode: string;
  presetId: string | null;
  linkedStoryId: string | null;
  request: GenerationRequest;
  brief: unknown;
  scriptPackage: unknown;
  preset: { id: string; slug: string; name: string } | null;
  episodes: {
    id: string;
    title: string;
    scriptText: string;
    summary: string | null;
  }[];
  assets: {
    id: string;
    kind: string;
    publicUrl: string | null;
    storageKey: string | null;
    imagePrompt?: string | null;
  }[];
  jobs: {
    id: string;
    step: string;
    status: string;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  }[];
};

const AGE = [
  { id: 'toddler', label: 'Toddler' },
  { id: '3-5', label: '3–5' },
  { id: '5-7', label: '5–7' },
  { id: '7-9', label: '7–9' },
  { id: '9-12', label: '9–12' },
] as const;

const STORY_TYPES = [
  { id: 'bedtime', label: 'Bedtime' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'funny', label: 'Funny' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'friendship', label: 'Friendship' },
  { id: 'learning', label: 'Learning' },
  { id: 'fairy-tale', label: 'Fairy tale' },
  { id: 'animal-tale', label: 'Animal tale' },
  { id: 'calming', label: 'Calming' },
  { id: 'silly-chaos', label: 'Silly chaos' },
] as const;

const FORMATS = [
  { id: 'standalone', label: 'Standalone' },
  { id: 'mini-series', label: 'Mini series' },
  { id: 'series-episode', label: 'Series episode' },
] as const;

const TONES = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'funny', label: 'Funny' },
  { id: 'whimsical', label: 'Whimsical' },
  { id: 'exciting', label: 'Exciting' },
  { id: 'soothing', label: 'Soothing' },
  { id: 'heartfelt', label: 'Heartfelt' },
  { id: 'curious', label: 'Curious' },
  { id: 'magical', label: 'Magical' },
  { id: 'gentle-suspense', label: 'Gentle suspense' },
] as const;

const LESSONS = [
  { id: 'bravery', label: 'Bravery' },
  { id: 'kindness', label: 'Kindness' },
  { id: 'patience', label: 'Patience' },
  { id: 'sharing', label: 'Sharing' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'teamwork', label: 'Teamwork' },
  { id: 'bedtime-calm', label: 'Bedtime calm' },
  { id: 'trying-new-things', label: 'Trying new things' },
] as const;

const CHARS = [
  { id: 'child', label: 'Child' },
  { id: 'animal', label: 'Animal' },
  { id: 'robot', label: 'Robot' },
  { id: 'sea-creature', label: 'Sea creature' },
  { id: 'magical-creature', label: 'Magical creature' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'superhero', label: 'Superhero' },
  { id: 'princess', label: 'Princess' },
  { id: 'explorer', label: 'Explorer' },
] as const;

const SETTINGS = [
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'city', label: 'City' },
  { id: 'school', label: 'School' },
  { id: 'space', label: 'Space' },
  { id: 'castle', label: 'Castle' },
  { id: 'backyard', label: 'Backyard' },
  { id: 'dream-world', label: 'Dream world' },
  { id: 'undersea-kingdom', label: 'Undersea kingdom' },
] as const;

const NARRATION = [
  { id: 'warm', label: 'Warm narrator' },
  { id: 'playful', label: 'Playful narrator' },
  { id: 'cinematic', label: 'Cinematic narrator' },
  { id: 'sleepy-bedtime', label: 'Sleepy bedtime' },
] as const;

const ENERGY = [
  { id: 'calm', label: 'Calm' },
  { id: 'expressive', label: 'Expressive' },
  { id: 'lively', label: 'Lively' },
  { id: 'dramatic', label: 'Dramatic' },
] as const;

const TAGS = [
  { id: 'light', label: 'Light tags' },
  { id: 'medium', label: 'Medium' },
  { id: 'expressive', label: 'Expressive' },
] as const;

const TARGET_LENGTH_RANGES = [
  { id: '2-3', label: '2–3 min' },
  { id: '3-4', label: '3–4 min' },
  { id: '4-5', label: '4–5 min' },
] as const;

function slugFromTitle(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return s;
}

function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  ms: number
) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: T) => {
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => fn(...args), ms);
    },
    [fn, ms]
  );
}

export function StoryStudioClient() {
  const router = useRouter();
  const search = useSearchParams();
  const draftIdFromUrl = search.get('draft');

  const [presets, setPresets] = useState<
    {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      defaults: unknown;
    }[]
  >([]);
  const [draft, setDraft] = useState<SerializedDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<PreviewTabId>('brief');
  const [idea, setIdea] = useState('');
  const [prompt, setPrompt] = useState('');
  const [slugEdit, setSlugEdit] = useState('');
  const [titleEdit, setTitleEdit] = useState('');
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [audioLoading, setAudioLoading] = useState<Record<string, boolean>>({});

  const draftIdRef = useRef<string | null>(null);
  const requestRef = useRef<GenerationRequest | null>(null);

  const saveDraftPatch = useCallback(async (body: Record<string, unknown>) => {
    const id = draftIdRef.current;
    if (!id) return;
    const res = await fetch(`/api/admin/story-studio/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Save failed');
    setDraft(json.draft);
    requestRef.current = json.draft.request;
  }, []);

  const debouncedFlushRequest = useDebouncedCallback(() => {
    const r = requestRef.current;
    if (!r) return;
    void saveDraftPatch({ request: r }).catch(console.error);
  }, 900);

  const req = draft?.request;

  useEffect(() => {
    if (tab !== 'audio') return;
    if (!draft?.assets?.length) return;
    const aud = draft.assets.filter(
      (a) => a.kind === 'episode_audio' && a.storageKey
    );
    if (!aud.length) return;

    let cancelled = false;
    const load = async (key: string) => {
      if (audioUrls[key]) return;
      setAudioLoading((m) => ({ ...m, [key]: true }));
      try {
        const res = await fetch(
          `/api/admin/story-studio/audio-url?key=${encodeURIComponent(key)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load audio URL');
        if (cancelled) return;
        setAudioUrls((m) => ({ ...m, [key]: json.url as string }));
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setAudioLoading((m) => ({ ...m, [key]: false }));
      }
    };

    aud.forEach((a) => void load(a.storageKey as string));
    return () => {
      cancelled = true;
    };
  }, [tab, draft?.assets, audioUrls]);

  const patchRequest = useCallback(
    (patch: Partial<GenerationRequest>) => {
      setDraft((d) => {
        if (!d) return d;
        const next = { ...d.request, ...patch };
        requestRef.current = next;
        debouncedFlushRequest();
        return { ...d, request: next };
      });
    },
    [debouncedFlushRequest]
  );

  useEffect(() => {
    void fetch('/api/admin/story-studio/presets')
      .then((r) => r.json())
      .then((j) => setPresets(j.presets ?? []))
      .catch(() => setPresets([]));
  }, []);

  const loadDraft = useCallback(async (id: string) => {
    setLoadError(null);
    const res = await fetch(`/api/admin/story-studio/drafts/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setLoadError(json.error || 'Failed to load draft');
      setDraft(null);
      return;
    }
    const d = json.draft as SerializedDraft;
    draftIdRef.current = d.id;
    requestRef.current = d.request;
    setDraft(d);
    setSlugEdit(d.slug);
    setTitleEdit(d.title);
    setIdea(d.request.simpleIdea ?? '');
    setPrompt(d.request.customPrompt ?? '');
    router.replace(`/admin/story-studio?draft=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }, [router]);

  useEffect(() => {
    if (draftIdFromUrl) void loadDraft(draftIdFromUrl);
    else {
      setDraft(null);
      setSlugEdit('');
      setTitleEdit('');
    }
  }, [draftIdFromUrl, loadDraft]);

  const createDraft = async (presetId?: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/story-studio/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create failed');
      await loadDraft(json.draft.id);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const runStep = async (step: string) => {
    if (!draft?.id) return;
    setBusy(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/story-studio/generate/${encodeURIComponent(step)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId: draft.id }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      if (json.draft) {
        setDraft(json.draft);
        setTitleEdit(String(json.draft.title ?? ''));
        setSlugEdit(String(json.draft.slug ?? ''));
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const pushLibrary = async () => {
    if (!draft?.id) return;
    setBusy(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/story-studio/push-to-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Push failed');
      await loadDraft(draft.id);
      alert(`Linked to story id ${json.storyId} (slug: ${json.slug})`);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Push failed');
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    if (!draft?.id) return;
    setBusy(true);
    try {
      await saveDraftPatch({
        title: titleEdit,
        slug: slugEdit,
        request: {
          simpleIdea: idea,
          customPrompt: prompt,
        },
      });
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = async (presetId: string) => {
    if (!draft?.id) return;
    const row = presets.find((p) => p.id === presetId) as
      | { id: string; defaults?: unknown }
      | undefined;
    if (!row || !('defaults' in row) || row.defaults == null) return;
    setBusy(true);
    try {
      await saveDraftPatch({
        presetId,
        request: row.defaults as Record<string, unknown>,
      });
    } finally {
      setBusy(false);
    }
  };

  const briefPretty = useMemo(() => {
    if (!draft?.brief) return '';
    try {
      return JSON.stringify(draft.brief, null, 2);
    } catch {
      return String(draft.brief);
    }
  }, [draft?.brief]);

  const scriptPretty = useMemo(() => {
    if (!draft?.scriptPackage) return '';
    try {
      return JSON.stringify(draft.scriptPackage, null, 2);
    } catch {
      return String(draft.scriptPackage);
    }
  }, [draft?.scriptPackage]);

  const scriptText = useMemo(() => {
    const pkg = draft?.scriptPackage as {
      episodes?: { scriptText: string; title: string }[];
      fullScript?: string;
    } | null;
    if (!pkg) return '';
    if (pkg.fullScript) return pkg.fullScript;
    if (pkg.episodes?.length)
      return pkg.episodes.map((e) => `## ${e.title}\n\n${e.scriptText}`).join('\n\n');
    return '';
  }, [draft?.scriptPackage]);

  const coverImagePromptText = useMemo(() => {
    if (!draft) return '';
    const coverAsset = draft.assets.find((a) => a.kind === 'cover');
    const stored = coverAsset?.imagePrompt?.trim();
    if (stored) return stored;
    return buildDraftCoverImagePrompt(draft.request, draft);
  }, [draft]);

  if (!draftIdFromUrl) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-10 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">
            Story Studio
          </h1>
          <p className="mt-2 text-slate-600">
            Guided kids audio stories — presets, prompts, and step-by-step
            generation. Nothing leaves your server without API keys you
            configure.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createDraft()}
            className="mt-6 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white shadow hover:bg-violet-700 disabled:opacity-50"
          >
            New blank draft
          </button>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase text-slate-500">
            Start from a preset
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                onClick={() => void createDraft(p.id)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow disabled:opacity-50"
              >
                <div className="font-semibold text-slate-900">{p.name}</div>
                {p.description && (
                  <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError && !draft) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        {loadError}
        <div className="mt-4">
          <Link
            href="/admin/story-studio"
            className="font-semibold text-violet-700 underline"
          >
            Back to Story Studio
          </Link>
        </div>
      </div>
    );
  }

  if (!draft || !req) {
    return (
      <div className="p-8 text-center text-slate-600">Loading draft…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Story Studio</h1>
          <p className="text-sm text-slate-600">
            Draft <span className="font-mono text-xs">{draft.id}</span>
            {draft.linkedStoryId && (
              <>
                {' '}
                · Linked story{' '}
                <span className="font-mono">{draft.linkedStoryId}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/story-studio"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            All drafts
          </Link>
          <Link
            href="/admin/stories"
            className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800"
          >
            Story library
          </Link>
        </div>
      </div>

      <GenerationStatusBar jobs={draft.jobs} busy={busy} />
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {loadError}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => patchRequest({ mode: 'quick' })}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                req.mode === 'quick'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Quick Build
            </button>
            <button
              type="button"
              onClick={() => patchRequest({ mode: 'prompt' })}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                req.mode === 'prompt'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Prompt Mode
            </button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500">
              Preset
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={draft.presetId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v) void applyPreset(v);
                else void saveDraftPatch({ presetId: null });
              }}
            >
              <option value="">None</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Title
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={titleEdit}
                onChange={(e) => {
                  const v = e.target.value;
                  const nextS = slugFromTitle(v);
                  setTitleEdit(v);
                  setSlugEdit(nextS);
                }}
                onBlur={() => void saveMeta()}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Story slug
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
                value={slugEdit}
                onChange={(e) => setSlugEdit(e.target.value)}
                onBlur={() => void saveMeta()}
              />
            </div>
          </div>

          {req.mode === 'quick' ? (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Simple idea
              </label>
              <textarea
                className="mt-1 min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="e.g. A shy robot who learns to sing"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onBlur={() => void saveMeta()}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Custom prompt
              </label>
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Full creative direction…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onBlur={() => void saveMeta()}
              />
            </div>
          )}

          <SelectionChips
            label="Age band"
            options={AGE}
            value={req.studioAgeBand}
            onChange={(id) =>
              patchRequest({
                studioAgeBand: id as GenerationRequest['studioAgeBand'],
              })
            }
          />
          <SelectionChips
            label="Story type"
            options={STORY_TYPES}
            value={req.storyType}
            onChange={(id) =>
              patchRequest({ storyType: id as GenerationRequest['storyType'] })
            }
          />
          <SelectionChips
            label="Format"
            options={FORMATS}
            value={req.format}
            onChange={(id) =>
              patchRequest({ format: id as GenerationRequest['format'] })
            }
          />
          {req.format !== 'standalone' && (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Episodes (mini-series)
              </label>
              <input
                type="number"
                min={2}
                max={12}
                className="mt-1 w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={req.episodeCount}
                onChange={(e) =>
                  patchRequest({
                    episodeCount: Math.min(
                      12,
                      Math.max(2, Number(e.target.value) || 2)
                    ),
                  })
                }
              />
            </div>
          )}
          <SelectionChips
            label="Target length"
            options={TARGET_LENGTH_RANGES}
            value={req.targetLengthRange}
            onChange={(id) =>
              patchRequest({
                targetLengthRange: id as GenerationRequest['targetLengthRange'],
              })
            }
          />
          <SelectionChips
            label="Tone"
            options={TONES}
            value={req.tone}
            onChange={(id) =>
              patchRequest({ tone: id as GenerationRequest['tone'] })
            }
          />
          <SelectionChips
            label="Lesson / theme"
            options={LESSONS}
            value={req.lesson}
            onChange={(id) =>
              patchRequest({ lesson: id as GenerationRequest['lesson'] })
            }
          />
          <SelectionChips
            label="Main character"
            options={CHARS}
            value={req.characterType}
            onChange={(id) =>
              patchRequest({
                characterType: id as GenerationRequest['characterType'],
              })
            }
          />
          <SelectionChips
            label="Setting"
            options={SETTINGS}
            value={req.setting}
            onChange={(id) =>
              patchRequest({ setting: id as GenerationRequest['setting'] })
            }
          />
          <SelectionChips
            label="Narration style"
            options={NARRATION}
            value={req.narrationStyle}
            onChange={(id) =>
              patchRequest({
                narrationStyle: id as GenerationRequest['narrationStyle'],
              })
            }
          />
          <SelectionChips
            label="Voice energy"
            options={ENERGY}
            value={req.voiceEnergy}
            onChange={(id) =>
              patchRequest({
                voiceEnergy: id as GenerationRequest['voiceEnergy'],
              })
            }
          />
          <SelectionChips
            label="Expression tag density"
            options={TAGS}
            value={req.tagDensity}
            onChange={(id) =>
              patchRequest({
                tagDensity: id as GenerationRequest['tagDensity'],
              })
            }
          />

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-slate-500">
              Generation toggles
            </p>
            <ToggleRow
              label="Intro / theme music"
              checked={req.includeIntroMusic}
              onChange={(v) => patchRequest({ includeIntroMusic: v })}
            />
            <ToggleRow
              label="Generate cover art"
              checked={req.generateCover}
              onChange={(v) => patchRequest({ generateCover: v })}
            />
            <ToggleRow
              label="Generate narration (ElevenLabs)"
              checked={req.generateAudio}
              onChange={(v) => patchRequest({ generateAudio: v })}
            />
            <ToggleRow
              label="Generate theme (Suno)"
              checked={req.generateTheme}
              onChange={(v) => patchRequest({ generateTheme: v })}
            />
            <ToggleRow
              label="Auto-publish when pushing to library"
              checked={req.autoPublish}
              onChange={(v) => patchRequest({ autoPublish: v })}
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runStep('brief')}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Generate brief
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runStep('script')}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Generate script
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runStep('cover')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Cover
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runStep('theme_full')}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Theme (full)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runStep('theme_intro')}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Theme intro
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runStep('tts')}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Narration audio
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runStep('package')}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Full package
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void pushLibrary()}
            className="w-full rounded-xl border-2 border-violet-500 py-3 text-sm font-bold text-violet-800 disabled:opacity-50"
          >
            Push to story library
          </button>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <PreviewTabs active={tab} onChange={setTab} />
          {tab === 'brief' && (
            <pre className="max-h-[560px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-100">
              {briefPretty || 'No brief yet — run Generate brief.'}
            </pre>
          )}
          {tab === 'script' && (
            <pre className="max-h-[560px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-sky-100 whitespace-pre-wrap">
              {scriptText || scriptPretty || 'No script yet.'}
            </pre>
          )}
          {tab === 'episodes' && (
            <ul className="space-y-3 text-sm">
              {draft.episodes.length === 0 && (
                <li className="text-slate-500">No episodes — generate script.</li>
              )}
              {draft.episodes.map((ep) => (
                <li
                  key={ep.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="font-semibold">{ep.title}</div>
                  <p className="mt-1 line-clamp-4 text-slate-600">
                    {ep.summary?.trim() || 'No episode summary yet.'}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {tab === 'cover' && (
            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <div className="mb-1 font-medium text-slate-800">
                  Image prompt
                </div>
                <pre className="max-h-[280px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-sky-100 whitespace-pre-wrap">
                  {coverImagePromptText.trim() || '—'}
                </pre>
              </div>
              {draft.assets.find((a) => a.kind === 'cover')?.publicUrl ? (
                <Image
                  src={
                    draft.assets.find((a) => a.kind === 'cover')!.publicUrl!
                  }
                  alt="Cover"
                  width={640}
                  height={640}
                  unoptimized
                  className="max-h-80 rounded-xl border object-contain"
                />
              ) : (
                <p>No cover asset yet.</p>
              )}
            </div>
          )}
          {tab === 'music' && (
            <ul className="space-y-2 text-sm text-slate-700">
              {draft.assets.filter((a) => a.kind.startsWith('theme')).length ===
                0 && <li>No theme assets yet.</li>}
              {draft.assets
                .filter((a) => a.kind.startsWith('theme'))
                .map((a) => (
                  <li key={a.id} className="font-mono text-xs">
                    {a.kind}: {a.storageKey ?? a.publicUrl ?? '—'}
                  </li>
                ))}
            </ul>
          )}
          {tab === 'audio' && (
            <ul className="space-y-2 text-sm">
              {draft.assets.filter((a) => a.kind === 'episode_audio').length ===
                0 && (
                <li className="text-slate-500">No episode audio yet.</li>
              )}
              {draft.assets
                .filter((a) => a.kind === 'episode_audio')
                .map((a) => (
                  <li
                    key={a.id}
                    className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="font-mono text-xs text-slate-700">
                      {a.storageKey ?? '—'}
                    </div>
                    {a.storageKey && audioUrls[a.storageKey] ? (
                      <div className="space-y-2">
                        <audio
                          controls
                          preload="none"
                          src={audioUrls[a.storageKey]}
                          className="w-full"
                        />
                        <a
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          href={audioUrls[a.storageKey]}
                          download
                        >
                          Download
                        </a>
                      </div>
                    ) : a.storageKey && audioLoading[a.storageKey] ? (
                      <div className="text-xs text-slate-500">
                        Preparing audio…
                      </div>
                    ) : a.storageKey ? (
                      <div className="text-xs text-slate-500">
                        Audio URL unavailable.
                      </div>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}
          {tab === 'publish' && (
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                Pushing maps this draft into the same <code>admin</code> save
                shape as the Story Library editor (slug, series, episodes,
                optional <code>audioStorageKey</code>, cover URL).
              </p>
              <p className="rounded-lg bg-slate-50 p-3 font-mono text-xs">
                catalog age: {req.catalogAgeRange} · genre:{' '}
                {req.catalogGenre ?? '—'} · mood: {req.catalogMood ?? '—'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
