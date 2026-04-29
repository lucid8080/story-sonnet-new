'use client';

import { useMemo, useState } from 'react';
import { StoryBriefPanel } from '@/components/admin/story-studio/StoryBriefPanel';
import { StoryScriptPanel } from '@/components/admin/story-studio/StoryScriptPanel';
import type { GenerationRequest } from '@/lib/story-studio/types';

type DraftShape = {
  id: string;
  seriesTitle: string;
  brief: unknown;
  scriptPackage: unknown;
  request: GenerationRequest;
  episodes: Array<{
    id: string;
    sortOrder: number;
    title: string;
    scriptText: string;
    summary: string | null;
    estimatedDurationSeconds: number | null;
  }>;
  assets: Array<{
    id: string;
    kind: string;
    publicUrl: string | null;
    storageKey?: string | null;
    draftEpisodeId: string | null;
  }>;
};

type TabId = 'brief' | 'script' | 'cover' | 'narration' | 'music';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'brief', label: 'Story Brief' },
  { id: 'script', label: 'Script' },
  { id: 'cover', label: 'Cover Art' },
  { id: 'narration', label: 'Narration' },
  { id: 'music', label: 'Music' },
];

export function CustomStoriesStudioClient(props: {
  orderId: string;
  orderStatus: string;
  initialVisibility: 'public' | 'private';
  draft: DraftShape;
}) {
  const [active, setActive] = useState<TabId>('brief');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftShape>(props.draft);
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    props.initialVisibility
  );

  const coverAssets = useMemo(
    () => draft.assets.filter((a) => a.kind === 'cover'),
    [draft.assets]
  );
  const musicAssets = useMemo(
    () => draft.assets.filter((a) => a.kind === 'theme_full' || a.kind === 'theme_intro'),
    [draft.assets]
  );
  const audioAssets = useMemo(
    () => draft.assets.filter((a) => a.kind === 'episode_audio'),
    [draft.assets]
  );
  const episodesWithMp3Count = useMemo(() => {
    if (!draft.episodes.length) return 0;
    const readyEpisodeIds = new Set(
      audioAssets
        .filter(
          (asset) =>
            !!asset.draftEpisodeId &&
            !!(asset.publicUrl?.trim() || asset.storageKey?.trim())
        )
        .map((asset) => asset.draftEpisodeId as string)
    );
    return draft.episodes.filter((episode) => readyEpisodeIds.has(episode.id))
      .length;
  }, [audioAssets, draft.episodes]);
  const totalEpisodes = draft.episodes.length;
  const missingMp3Count = Math.max(0, totalEpisodes - episodesWithMp3Count);
  const productionIncomplete = totalEpisodes > 0 && missingMp3Count > 0;

  async function runGenerate(step: string, draftEpisodeId?: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/custom-stories/${props.orderId}/generate/${step}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftEpisodeId: draftEpisodeId ?? null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      if (json.draft) setDraft(json.draft);
      setNotice('Generation finished');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveDraftPatch(body: Record<string, unknown>) {
    const res = await fetch(`/api/custom-stories/${props.orderId}/draft`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Save failed');
    if (json.draft) setDraft(json.draft);
    return json;
  }

  async function pushToLibrary() {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-stories/${props.orderId}/push-to-library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Publish failed');
      setNotice('Story pushed to your library');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{draft.seriesTitle}</h1>
            <p className="text-sm text-slate-600">Order status: {props.orderStatus}</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="story-visibility" className="text-xs font-semibold text-slate-700">
              Visibility
            </label>
            <select
              id="story-visibility"
              value={visibility}
              disabled={busy}
              onChange={(event) =>
                setVisibility(event.target.value as 'public' | 'private')
              }
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <button
              type="button"
              onClick={() => void pushToLibrary()}
              disabled={busy}
              className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Push to library
            </button>
          </div>
        </div>
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
            totalEpisodes === 0
              ? 'border-slate-200 bg-slate-50 text-slate-700'
              : productionIncomplete
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-emerald-300 bg-emerald-50 text-emerald-900'
          }`}
        >
          {totalEpisodes === 0 ? (
            <p>Add episodes before pushing this story to your library.</p>
          ) : (
            <>
              <p className="font-semibold">
                Episodes with MP3: {episodesWithMp3Count}/{totalEpisodes}
              </p>
              {productionIncomplete ? (
                <p className="mt-1">
                  Production is incomplete. {missingMp3Count} episode
                  {missingMp3Count === 1 ? '' : 's'} still
                  {' '}need MP3 audio. You can push now, but those episodes will
                  be unavailable until narration is generated.
                </p>
              ) : (
                <p className="mt-1">All episodes have narration audio ready.</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
              active === t.id ? 'bg-white text-violet-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice ? (
        <p className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">{notice}</p>
      ) : null}

      {active === 'brief' && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runGenerate('brief')}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate brief
          </button>
          <StoryBriefPanel
            draftId={draft.id}
            draftSeriesTitle={draft.seriesTitle}
            brief={draft.brief}
            request={draft.request}
            busy={busy}
            saveDraftPatch={saveDraftPatch}
            onSaveNotice={setNotice}
          />
        </section>
      )}

      {active === 'script' && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runGenerate('script')}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate script
          </button>
          <StoryScriptPanel
            draftId={draft.id}
            draftTitle={draft.seriesTitle}
            request={draft.request}
            episodes={draft.episodes}
            scriptPackage={draft.scriptPackage}
            hasBrief={!!draft.brief}
            busy={busy}
            saveDraftPatch={saveDraftPatch}
            runTtsForEpisode={async (draftEpisodeId) => runGenerate('tts', draftEpisodeId)}
            onSaveNotice={setNotice}
          />
        </section>
      )}

      {active === 'cover' && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runGenerate('cover')}
            className="rounded-lg bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate cover art
          </button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coverAssets.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                disabled={!asset.publicUrl}
                onClick={() => setSelectedCoverUrl(asset.publicUrl)}
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-2 disabled:cursor-not-allowed"
              >
                <div className="h-48 w-full">
                  <img
                    src={asset.publicUrl ?? ''}
                    alt={`Generated cover ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {active === 'narration' && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <button
            type="button"
            disabled={busy || draft.episodes.length === 0}
            onClick={() => void runGenerate('tts', draft.episodes[0]?.id)}
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate narration
          </button>
          <ul className="space-y-2 text-sm">
            {audioAssets.map((asset) => (
              <li key={asset.id} className="rounded-lg border border-slate-200 p-2">
                <a href={asset.publicUrl ?? '#'} target="_blank" rel="noreferrer" className="text-sky-700 underline">
                  Episode narration
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {active === 'music' && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runGenerate('theme_full')}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Generate full theme
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runGenerate('theme_intro')}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Generate intro theme
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {musicAssets.map((asset) => (
              <li key={asset.id} className="rounded-lg border border-slate-200 p-2">
                <a href={asset.publicUrl ?? '#'} target="_blank" rel="noreferrer" className="text-sky-700 underline">
                  {asset.kind}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedCoverUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedCoverUrl(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl rounded-2xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCoverUrl(null)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
            <div className="h-[70vh] w-full">
              <img
                src={selectedCoverUrl}
                alt="Full-size generated cover"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
