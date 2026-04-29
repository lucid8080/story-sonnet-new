'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import {
  ART_STYLE_OPTIONS,
  type ArtStylePromptOverrides,
} from '@/lib/story-studio/art-style-options';
import type { ArtStyleId } from '@/lib/story-studio/art-style-options';
import { draftSlugFromTitle } from '@/lib/story-studio/draft-slug-from-title';
import {
  defaultPresetFieldEnabled,
  type PresetFieldToggleKey,
} from '@/lib/story-studio/preset-field-toggles';
import { buildDraftCoverImagePrompt } from '@/lib/story-studio/prompt-builder';
import { studioSeriesTitleForDraftMeta } from '@/lib/story-studio/studio-series-for-draft-meta';
import type { GenerationRequest } from '@/lib/story-studio/types';
import { ArtStylePresetPromptsEditor } from './ArtStylePresetPromptsEditor';
import { GenerationStatusBar } from './GenerationStatusBar';
import { PreviewTabs, type PreviewTabId } from './PreviewTabs';
import { SelectionChips, ToggleRow } from './SelectionChips';
import { StoryBriefPanel } from './StoryBriefPanel';
import { StoryScriptPanel } from './StoryScriptPanel';
import { GenerationToolSelector } from '@/components/admin/generation/GenerationToolSelector';

type SerializedDraft = {
  id: string;
  seriesTitle: string;
  slug: string;
  mode: string;
  presetId: string | null;
  linkedStoryId: string | null;
  updatedAt: string;
  request: GenerationRequest;
  brief: unknown;
  scriptPackage: unknown;
  preset: { id: string; slug: string; name: string } | null;
  episodes: {
    id: string;
    sortOrder: number;
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
    createdAt?: string;
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

function formatDraftUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatCoverAssetCaption(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function DraftCoverThumb({
  url,
  title,
}: {
  url: string | null | undefined;
  title: string;
}) {
  if (!url?.trim()) return null;
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <Image
        src={url}
        alt={title ? `Cover: ${title}` : 'Cover'}
        width={56}
        height={56}
        unoptimized
        className="h-full w-full object-cover"
      />
    </div>
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
  const [customArtStyleEdit, setCustomArtStyleEdit] = useState('');
  const [artStylePromptOverrides, setArtStylePromptOverrides] =
    useState<ArtStylePromptOverrides>({});
  const [slugEdit, setSlugEdit] = useState('');
  const [seriesTitleEdit, setSeriesTitleEdit] = useState('');
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [audioLoading, setAudioLoading] = useState<Record<string, boolean>>({});

  type DraftSummary = {
    id: string;
    seriesTitle: string;
    slug: string;
    mode: string;
    updatedAt: string;
    linkedStoryId: string | null;
    coverThumbnailUrl?: string | null;
  };
  const [linkedDrafts, setLinkedDrafts] = useState<DraftSummary[]>([]);
  const [recentDrafts, setRecentDrafts] = useState<DraftSummary[]>([]);
  const [draftListsLoading, setDraftListsLoading] = useState(false);
  const [draftListsError, setDraftListsError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [coverLightboxUrl, setCoverLightboxUrl] = useState<string | null>(
    null
  );
  const [coverImagePromptEdit, setCoverImagePromptEdit] = useState('');

  const draftIdRef = useRef<string | null>(null);
  const requestRef = useRef<GenerationRequest | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverLightboxDialogRef = useRef<HTMLDialogElement>(null);
  const coverLightboxReturnFocusRef = useRef<HTMLElement | null>(null);

  const applyMetaFromDraft = useCallback((d: SerializedDraft) => {
    const st = studioSeriesTitleForDraftMeta(d.brief, d.scriptPackage);
    if (st) {
      setSeriesTitleEdit(st);
      setSlugEdit(draftSlugFromTitle(st));
    } else {
      setSeriesTitleEdit(String(d.seriesTitle ?? ''));
      setSlugEdit(String(d.slug ?? ''));
    }
  }, []);

  const saveDraftPatch = useCallback(
    async (body: Record<string, unknown>): Promise<SerializedDraft | undefined> => {
      const id = draftIdRef.current;
      if (!id) return undefined;
      const res = await fetch(`/api/admin/story-studio/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      const d = json.draft as SerializedDraft;
      setDraft(d);
      requestRef.current = d.request;
      const shouldRefreshMeta =
        'brief' in body ||
        'scriptPackage' in body ||
        'seriesTitle' in body ||
        'slug' in body;
      if (shouldRefreshMeta) {
        applyMetaFromDraft(d);
      }
      return d;
    },
    [applyMetaFromDraft]
  );

  const runTtsForEpisode = useCallback(
    async (draftEpisodeId: string) => {
      const id = draftIdRef.current;
      if (!id) return;
      setBusy(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/admin/story-studio/generate/${encodeURIComponent('tts')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftId: id, draftEpisodeId }),
          }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Narration failed');
        if (json.draft) {
          const d = json.draft as SerializedDraft;
          requestRef.current = d.request;
          setDraft(d);
          applyMetaFromDraft(d);
          setIdea(d.request.simpleIdea ?? '');
          setPrompt(d.request.customPrompt ?? '');
          setCustomArtStyleEdit(d.request.customArtStyle ?? '');
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Narration failed');
      } finally {
        setBusy(false);
      }
    },
    [applyMetaFromDraft]
  );

  const flashSaveNotice = useCallback((msg: string) => {
    setSaveNotice(msg);
    window.setTimeout(() => setSaveNotice(null), 2500);
  }, []);

  const cancelDebouncedRequestSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const saveCoverImagePrompt = useCallback(async () => {
    cancelDebouncedRequestSave();
    setBusy(true);
    setLoadError(null);
    try {
      await saveDraftPatch({
        request: { coverImagePromptDraft: coverImagePromptEdit.trim() },
      });
      flashSaveNotice('Image prompt saved');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }, [
    cancelDebouncedRequestSave,
    coverImagePromptEdit,
    flashSaveNotice,
    saveDraftPatch,
  ]);

  const debouncedFlushRequest = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      const r = requestRef.current;
      if (!r) return;
      void saveDraftPatch({ request: r }).catch(console.error);
    }, 900);
  }, [saveDraftPatch]);

  const req = draft?.request;
  const presetFieldEnabled = req?.presetFieldEnabled ?? defaultPresetFieldEnabled();
  const isPresetFieldOn = useCallback(
    (key: PresetFieldToggleKey) => presetFieldEnabled[key] !== false,
    [presetFieldEnabled]
  );

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

  const setPresetFieldEnabled = useCallback(
    (key: PresetFieldToggleKey, enabled: boolean) => {
      const current = requestRef.current;
      const nextMap = {
        ...(current?.presetFieldEnabled ?? defaultPresetFieldEnabled()),
        [key]: enabled,
      };
      patchRequest({ presetFieldEnabled: nextMap });
    },
    [patchRequest]
  );

  useEffect(() => {
    void fetch('/api/admin/story-studio/presets')
      .then((r) => r.json())
      .then((j) => setPresets(j.presets ?? []))
      .catch(() => setPresets([]));
  }, []);

  useEffect(() => {
    if (!draftIdFromUrl) return;
    let cancelled = false;
    void fetch('/api/admin/story-studio/settings')
      .then(async (r) => {
        const j = (await r.json()) as {
          ok?: boolean;
          artStylePromptOverrides?: ArtStylePromptOverrides;
          error?: string;
        };
        if (!r.ok) throw new Error(j.error || 'Settings load failed');
        return j;
      })
      .then((j) => {
        if (cancelled) return;
        setArtStylePromptOverrides(j.artStylePromptOverrides ?? {});
      })
      .catch(() => {
        if (!cancelled) setArtStylePromptOverrides({});
      });
    return () => {
      cancelled = true;
    };
  }, [draftIdFromUrl]);

  const refreshDraftLists = useCallback(() => {
    setDraftListsLoading(true);
    setDraftListsError(null);
    void fetch('/api/admin/story-studio/drafts')
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Could not load drafts');
        setLinkedDrafts(
          Array.isArray(j.linkedDrafts) ? j.linkedDrafts : []
        );
        setRecentDrafts(
          Array.isArray(j.recentDrafts) ? j.recentDrafts : []
        );
      })
      .catch((e) => {
        setDraftListsError(
          e instanceof Error ? e.message : 'Could not load drafts'
        );
        setLinkedDrafts([]);
        setRecentDrafts([]);
      })
      .finally(() => setDraftListsLoading(false));
  }, []);

  useEffect(() => {
    if (draftIdFromUrl) return;
    refreshDraftLists();
  }, [draftIdFromUrl, refreshDraftLists]);

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
    applyMetaFromDraft(d);
    setIdea(d.request.simpleIdea ?? '');
    setPrompt(d.request.customPrompt ?? '');
    setCustomArtStyleEdit(d.request.customArtStyle ?? '');
    router.replace(`/admin/story-studio?draft=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }, [router, applyMetaFromDraft]);

  useEffect(() => {
    if (draftIdFromUrl) void loadDraft(draftIdFromUrl);
    else {
      setDraft(null);
      setSlugEdit('');
      setSeriesTitleEdit('');
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
        const d = json.draft as SerializedDraft;
        requestRef.current = d.request;
        setDraft(d);
        applyMetaFromDraft(d);
        setIdea(d.request.simpleIdea ?? '');
        setPrompt(d.request.customPrompt ?? '');
        setCustomArtStyleEdit(d.request.customArtStyle ?? '');
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

  const saveDraftNow = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!draftIdRef.current) return;
      cancelDebouncedRequestSave();
      setBusy(true);
      setLoadError(null);
      try {
        const r = requestRef.current;
        if (!r) return;
        await saveDraftPatch({
          seriesTitle: seriesTitleEdit,
          slug: slugEdit,
          request: {
            ...r,
            simpleIdea: idea,
            customPrompt: prompt,
            customArtStyle: customArtStyleEdit.trim(),
          },
        });
        if (!opts?.silent) {
          flashSaveNotice('Saved');
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setBusy(false);
      }
    },
    [
      cancelDebouncedRequestSave,
      flashSaveNotice,
      idea,
      prompt,
      customArtStyleEdit,
      saveDraftPatch,
      slugEdit,
      seriesTitleEdit,
    ]
  );

  const saveMeta = async () => {
    await saveDraftNow({ silent: true });
  };

  const deleteDraftRow = useCallback(
    async (id: string, linkedStoryId: string | null, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const firstMsg = linkedStoryId
        ? 'Delete this Story Studio draft? The linked library story will stay unless you choose to remove it in the next step.'
        : 'Delete this draft?';
      if (!window.confirm(firstMsg)) {
        return;
      }

      let deleteLinkedStory = false;
      if (linkedStoryId) {
        deleteLinkedStory = window.confirm(
          'Also delete the linked library story (series) and its cover/audio files in storage? Choose Cancel to delete only the draft row.'
        );
      }

      try {
        const res = await fetch(
          `/api/admin/story-studio/drafts/${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleteLinkedStory }),
          }
        );
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Delete failed');
        setLinkedDrafts((prev) => prev.filter((d) => d.id !== id));
        setRecentDrafts((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Delete failed');
      }
    },
    []
  );

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

  const draftCoverAssets = useMemo(() => {
    if (!draft?.assets?.length) return [];
    const rows = draft.assets.filter(
      (a) => a.kind === 'cover' && a.publicUrl?.trim()
    );
    return [...rows].sort((a, b) => {
      const ta =
        typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : 0;
      const tb =
        typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
  }, [draft]);

  const activeMainCoverAssetId = useMemo(() => {
    const selected = req?.mainCoverAssetId?.trim();
    if (selected && draftCoverAssets.some((a) => a.id === selected)) {
      return selected;
    }
    return draftCoverAssets[0]?.id ?? null;
  }, [draftCoverAssets, req?.mainCoverAssetId]);

  /** Resolved prompt shown by default (matches server cover step when draft override empty). */
  const resolvedCoverImagePrompt = useMemo(() => {
    if (!draft) return '';
    const fromDraft = draft.request.coverImagePromptDraft?.trim();
    if (fromDraft) return fromDraft;
    for (const a of draftCoverAssets) {
      const stored = a.imagePrompt?.trim();
      if (stored) return stored;
    }
    return buildDraftCoverImagePrompt(
      draft.request,
      draft,
      artStylePromptOverrides
    );
  }, [draft, draftCoverAssets, artStylePromptOverrides]);

  const setMainCoverAsset = useCallback(
    async (assetId: string) => {
      if (!draft?.id) return;
      if (activeMainCoverAssetId === assetId) return;
      cancelDebouncedRequestSave();
      setBusy(true);
      setLoadError(null);
      try {
        await saveDraftPatch({
          request: { mainCoverAssetId: assetId },
        });
        flashSaveNotice('Main cover selected');
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not set main cover');
      } finally {
        setBusy(false);
      }
    },
    [
      activeMainCoverAssetId,
      cancelDebouncedRequestSave,
      draft?.id,
      flashSaveNotice,
      saveDraftPatch,
    ]
  );

  useEffect(() => {
    if (!draft?.id) {
      setCoverImagePromptEdit('');
      return;
    }
    setCoverImagePromptEdit(resolvedCoverImagePrompt);
  }, [draft?.id, draft?.updatedAt, resolvedCoverImagePrompt]);

  useEffect(() => {
    const el = coverLightboxDialogRef.current;
    if (!el) return;
    if (coverLightboxUrl) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [coverLightboxUrl]);

  useEffect(() => {
    const el = coverLightboxDialogRef.current;
    if (!el) return;
    const handleClose = () => {
      setCoverLightboxUrl(null);
      const node = coverLightboxReturnFocusRef.current;
      coverLightboxReturnFocusRef.current = null;
      queueMicrotask(() => node?.focus?.());
    };
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, []);

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
        {draftListsLoading && (
          <p className="text-sm text-slate-500">Loading drafts…</p>
        )}
        {draftListsError && (
          <p className="text-sm text-red-600">{draftListsError}</p>
        )}
        {!draftListsLoading &&
          !draftListsError &&
          linkedDrafts.length === 0 &&
          recentDrafts.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No drafts yet — create one above or from a preset.
            </div>
          )}
        {!draftListsLoading &&
          !draftListsError &&
          (linkedDrafts.length > 0 || recentDrafts.length > 0) && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-bold uppercase text-slate-500">
                    Linked to library
                  </h2>
                  {linkedDrafts.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {linkedDrafts.length}
                      {linkedDrafts.length >= 500 ? '+' : ''} drafts
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Pushed drafts stay listed here (not capped like unlinked
                  recents).
                </p>
                {linkedDrafts.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No linked drafts — push a draft to the story library to see
                    it here.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {linkedDrafts.map((d) => (
                      <li key={d.id} className="flex items-stretch gap-2">
                        <Link
                          href={`/admin/story-studio?draft=${encodeURIComponent(d.id)}`}
                          className="flex min-w-0 flex-1 items-center gap-3 py-3 transition hover:bg-slate-50/80 -mx-2 px-2 rounded-xl"
                        >
                          <DraftCoverThumb
                            url={d.coverThumbnailUrl}
                            title={d.seriesTitle || 'Untitled draft'}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 truncate">
                              {d.seriesTitle || 'Untitled draft'}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                              <span>{formatDraftUpdated(d.updatedAt)}</span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {d.slug}
                              </span>
                              {d.linkedStoryId && (
                                <span className="text-violet-600">
                                  Story {d.linkedStoryId}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 self-center text-xs font-medium uppercase text-violet-600">
                            Open →
                          </span>
                        </Link>
                        <button
                          type="button"
                          className="shrink-0 self-center rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          onClick={(e) =>
                            void deleteDraftRow(d.id, d.linkedStoryId, e)
                          }
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-bold uppercase text-slate-500">
                    Recent drafts
                  </h2>
                  {recentDrafts.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {recentDrafts.length}
                      {recentDrafts.length >= 100 ? '+' : ''} unlinked
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Work in progress — up to 100 most recently updated unlinked
                  drafts.
                </p>
                {recentDrafts.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No unlinked drafts in the recent window.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {recentDrafts.map((d) => (
                      <li key={d.id} className="flex items-stretch gap-2">
                        <Link
                          href={`/admin/story-studio?draft=${encodeURIComponent(d.id)}`}
                          className="flex min-w-0 flex-1 items-center gap-3 py-3 transition hover:bg-slate-50/80 -mx-2 px-2 rounded-xl"
                        >
                          <DraftCoverThumb
                            url={d.coverThumbnailUrl}
                            title={d.seriesTitle || 'Untitled draft'}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 truncate">
                              {d.seriesTitle || 'Untitled draft'}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                              <span>{formatDraftUpdated(d.updatedAt)}</span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {d.slug}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 self-center text-xs font-medium uppercase text-violet-600">
                            Open →
                          </span>
                        </Link>
                        <button
                          type="button"
                          className="shrink-0 self-center rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          onClick={(e) =>
                            void deleteDraftRow(d.id, d.linkedStoryId, e)
                          }
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
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
    <>
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveDraftNow()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-violet-700 disabled:opacity-50"
          >
            Save draft
          </button>
          {saveNotice && (
            <span className="text-sm font-medium text-green-700">
              {saveNotice}
            </span>
          )}
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
                Series title
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={seriesTitleEdit}
                onChange={(e) => {
                  const v = e.target.value;
                  const nextS = slugFromTitle(v);
                  setSeriesTitleEdit(v);
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3 sm:col-span-2">
              <SelectionChips
                label="Art Style"
                options={ART_STYLE_OPTIONS}
                columns={4}
                value={req.artStyle}
                muted={!isPresetFieldOn('artStyle')}
                toggleChecked={isPresetFieldOn('artStyle')}
                onToggleChange={(v) => setPresetFieldEnabled('artStyle', v)}
                onChange={(id) =>
                  patchRequest({
                    artStyle: id as ArtStyleId,
                  })
                }
              />
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">
                  Custom art style
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Optional — extra direction for cover illustration"
                  value={customArtStyleEdit}
                  maxLength={600}
                  onChange={(e) => setCustomArtStyleEdit(e.target.value)}
                  onBlur={() => void saveMeta()}
                />
              </div>
              <ArtStylePresetPromptsEditor
                storedOverrides={artStylePromptOverrides}
                onSaved={setArtStylePromptOverrides}
              />
            </div>
            <SelectionChips
              label="Age band"
              options={AGE}
              value={req.studioAgeBand}
              muted={!isPresetFieldOn('studioAgeBand')}
              toggleChecked={isPresetFieldOn('studioAgeBand')}
              onToggleChange={(v) => setPresetFieldEnabled('studioAgeBand', v)}
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
              muted={!isPresetFieldOn('storyType')}
              toggleChecked={isPresetFieldOn('storyType')}
              onToggleChange={(v) => setPresetFieldEnabled('storyType', v)}
              onChange={(id) =>
                patchRequest({ storyType: id as GenerationRequest['storyType'] })
              }
            />
            <SelectionChips
              label="Format"
              options={FORMATS}
              value={req.format}
              muted={!isPresetFieldOn('format')}
              toggleChecked={isPresetFieldOn('format')}
              onToggleChange={(v) => setPresetFieldEnabled('format', v)}
              onChange={(id) =>
                patchRequest({ format: id as GenerationRequest['format'] })
              }
            />
            <SelectionChips
              label="Target length"
              options={TARGET_LENGTH_RANGES}
              value={req.targetLengthRange}
              muted={!isPresetFieldOn('targetLengthRange')}
              toggleChecked={isPresetFieldOn('targetLengthRange')}
              onToggleChange={(v) => setPresetFieldEnabled('targetLengthRange', v)}
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
              muted={!isPresetFieldOn('tone')}
              toggleChecked={isPresetFieldOn('tone')}
              onToggleChange={(v) => setPresetFieldEnabled('tone', v)}
              onChange={(id) =>
                patchRequest({ tone: id as GenerationRequest['tone'] })
              }
            />
            <SelectionChips
              label="Lesson / theme"
              options={LESSONS}
              value={req.lesson}
              muted={!isPresetFieldOn('lesson')}
              toggleChecked={isPresetFieldOn('lesson')}
              onToggleChange={(v) => setPresetFieldEnabled('lesson', v)}
              onChange={(id) =>
                patchRequest({ lesson: id as GenerationRequest['lesson'] })
              }
            />
            <SelectionChips
              label="Main character"
              options={CHARS}
              value={req.characterType}
              muted={!isPresetFieldOn('characterType')}
              toggleChecked={isPresetFieldOn('characterType')}
              onToggleChange={(v) => setPresetFieldEnabled('characterType', v)}
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
              muted={!isPresetFieldOn('setting')}
              toggleChecked={isPresetFieldOn('setting')}
              onToggleChange={(v) => setPresetFieldEnabled('setting', v)}
              onChange={(id) =>
                patchRequest({ setting: id as GenerationRequest['setting'] })
              }
            />
            <SelectionChips
              label="Narration style"
              options={NARRATION}
              value={req.narrationStyle}
              muted={!isPresetFieldOn('narrationStyle')}
              toggleChecked={isPresetFieldOn('narrationStyle')}
              onToggleChange={(v) => setPresetFieldEnabled('narrationStyle', v)}
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
              muted={!isPresetFieldOn('voiceEnergy')}
              toggleChecked={isPresetFieldOn('voiceEnergy')}
              onToggleChange={(v) => setPresetFieldEnabled('voiceEnergy', v)}
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
              muted={!isPresetFieldOn('tagDensity')}
              toggleChecked={isPresetFieldOn('tagDensity')}
              onToggleChange={(v) => setPresetFieldEnabled('tagDensity', v)}
              onChange={(id) =>
                patchRequest({
                  tagDensity: id as GenerationRequest['tagDensity'],
                })
              }
            />
          </div>

          {req.format !== 'standalone' && (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Episodes (mini-series)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={12}
                  className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                <input
                  type="checkbox"
                  aria-label="Episode count preset toggle"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  checked={isPresetFieldOn('episodeCount')}
                  onChange={(e) =>
                    setPresetFieldEnabled('episodeCount', e.target.checked)
                  }
                />
              </div>
            </div>
          )}

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

          <div className="grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
            <GenerationToolSelector
              family="text"
              toolKey="story_studio_generate_brief"
              label="Provider + Model (Generate brief)"
            />
            <GenerationToolSelector
              family="text"
              toolKey="story_studio_generate_script"
              label="Provider + Model (Generate script)"
            />
            <GenerationToolSelector
              family="image"
              toolKey="story_studio_generate_cover"
              label="Provider + Model (Cover)"
            />
            <GenerationToolSelector
              family="audio_narration"
              toolKey="story_studio_narration"
              label="Provider + Voice (Narration)"
            />
          </div>

          <div className="flex flex-wrap gap-2">
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
            <StoryBriefPanel
              draftId={draft.id}
              draftSeriesTitle={draft.seriesTitle}
              brief={draft.brief}
              request={req}
              busy={busy}
              saveDraftPatch={saveDraftPatch}
              onSaveNotice={flashSaveNotice}
            />
          )}
          {tab === 'script' && (
            <StoryScriptPanel
              draftId={draft.id}
              draftTitle={draft.seriesTitle}
              request={req}
              episodes={draft.episodes}
              scriptPackage={draft.scriptPackage}
              hasBrief={draft.brief != null}
              seriesSummaryHint={
                draft.brief &&
                typeof draft.brief === 'object' &&
                'summary' in draft.brief &&
                typeof (draft.brief as { summary?: unknown }).summary ===
                  'string'
                  ? (draft.brief as { summary: string }).summary
                  : undefined
              }
              busy={busy}
              saveDraftPatch={saveDraftPatch}
              runTtsForEpisode={runTtsForEpisode}
              onSaveNotice={flashSaveNotice}
            />
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
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    Image prompt
                  </span>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      coverImagePromptEdit.trim() ===
                        resolvedCoverImagePrompt.trim()
                    }
                    onClick={() => void saveCoverImagePrompt()}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Save image prompt
                  </button>
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  Saved prompt is used the next time you run Generate cover art.
                  Clear the field and save to fall back to the auto-built prompt
                  (or the newest stored cover prompt).
                </p>
                <textarea
                  className="max-h-[min(320px,50vh)] min-h-[140px] w-full resize-y rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-sky-100 shadow-inner focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  spellCheck={false}
                  value={coverImagePromptEdit}
                  onChange={(e) => setCoverImagePromptEdit(e.target.value)}
                  aria-label="Cover image generation prompt"
                />
              </div>
              {draftCoverAssets.length > 0 ? (
                <div>
                  <div className="mb-2 font-medium text-slate-800">
                    Generated covers ({draftCoverAssets.length})
                  </div>
                  <p className="mb-3 text-xs text-slate-500">
                    Newest first. Main cover is used when you push to the
                    library. Click a cover to view full size.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {draftCoverAssets.map((a) => (
                      <div key={a.id} className="space-y-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            coverLightboxReturnFocusRef.current =
                              e.currentTarget;
                            setCoverLightboxUrl(a.publicUrl!);
                          }}
                          className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left shadow-sm ring-violet-400 transition hover:border-violet-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                          aria-label="View cover full size"
                        >
                          <Image
                            src={a.publicUrl!}
                            alt="Story cover"
                            width={400}
                            height={500}
                            unoptimized
                            className="aspect-[4/5] w-full object-cover transition group-hover:opacity-95"
                          />
                          <span className="sr-only">Open full size</span>
                        </button>
                        <div className="flex items-center justify-center gap-2">
                          {a.id === activeMainCoverAssetId ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                              Main cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void setMainCoverAsset(a.id)}
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:opacity-50"
                            >
                              Set as main
                            </button>
                          )}
                        </div>
                        {a.createdAt ? (
                          <p className="text-center text-[11px] leading-tight text-slate-500">
                            {formatCoverAssetCaption(a.createdAt)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
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

      <dialog
        ref={coverLightboxDialogRef}
        className="m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 text-slate-800 shadow-none [&::backdrop]:bg-slate-900/75"
        aria-labelledby="story-studio-cover-lightbox-title"
      >
        <div
          className="flex min-h-full items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              coverLightboxDialogRef.current?.close();
            }
          }}
        >
          <div className="relative flex max-h-[min(92vh,56rem)] max-w-[min(96vw,44rem)] flex-col items-center">
            <div className="mb-2 flex w-full items-center justify-between gap-3 px-1">
              <h2
                id="story-studio-cover-lightbox-title"
                className="text-sm font-semibold text-white drop-shadow"
              >
                Cover preview
              </h2>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Close cover preview"
                onClick={() => coverLightboxDialogRef.current?.close()}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {coverLightboxUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- large signed/external URL in modal
              <img
                src={coverLightboxUrl}
                alt="Cover full size"
                className="max-h-[min(88vh,52rem)] max-w-full rounded-xl border border-white/20 object-contain shadow-2xl"
              />
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
