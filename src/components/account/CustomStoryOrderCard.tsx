'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatUsdFromCents } from '@/lib/custom-stories/config';

type EpisodeRow = {
  id: string;
  episodeNumber: number;
  title: string;
};

type Props = {
  orderId: string;
  storyStudioDraftId: string | null;
  packageLabel: string;
  currentPriceCents: number;
  status: string;
  coverUrl: string | null;
  storyTitle: string | null;
  storySlug: string | null;
  visibility: 'public' | 'private';
  episodes: EpisodeRow[];
  totalEpisodes: number;
  episodesWithAudio: number;
  nfcRequested: boolean;
};

export function draftStudioHrefForOrder(orderId: string): string {
  return `/custom-stories/${orderId}/studio`;
}

export function getProductionAudioStatus(totalEpisodes: number, episodesWithAudio: number) {
  const missingAudioEpisodes = Math.max(0, totalEpisodes - episodesWithAudio);
  const productionIncomplete = totalEpisodes > 0 && missingAudioEpisodes > 0;
  return { missingAudioEpisodes, productionIncomplete };
}

export function mapEpisodePlaybackError(rawError: string | null | undefined): string {
  const normalized = (rawError ?? '').toLowerCase();
  if (
    normalized.includes('no audio') ||
    normalized.includes('not ready') ||
    normalized.includes('episode not found')
  ) {
    return 'This episode audio is not ready yet. Generate or upload the MP3 in Story Studio, then try again.';
  }
  return rawError?.trim() || 'Unable to fetch audio for this episode.';
}

export function CustomStoryOrderCard(props: Props) {
  const router = useRouter();
  const [busyEpisode, setBusyEpisode] = useState<string | null>(null);
  const [busyNfc, setBusyNfc] = useState(false);
  const [busyVisibility, setBusyVisibility] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [episodeNotice, setEpisodeNotice] = useState<string | null>(null);
  const [nfcRequested, setNfcRequested] = useState(props.nfcRequested);
  const [visibility, setVisibility] = useState<'public' | 'private'>(props.visibility);
  const hasDraft = !!props.storyStudioDraftId;
  const draftHref = draftStudioHrefForOrder(props.orderId);
  const { missingAudioEpisodes, productionIncomplete } = getProductionAudioStatus(
    props.totalEpisodes,
    props.episodesWithAudio
  );

  async function openEpisodeAudio(episodeId: string) {
    try {
      setEpisodeNotice(null);
      setBusyEpisode(episodeId);
      const res = await fetch(`/api/audio/play?episodeId=${encodeURIComponent(episodeId)}`);
      const json = await res.json();
      if (!res.ok || !json.url) {
        const rawError = typeof json.error === 'string' ? json.error : '';
        throw new Error(mapEpisodePlaybackError(rawError));
      }
      window.open(json.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setEpisodeNotice(
        e instanceof Error
          ? e.message
          : 'This episode audio is not ready yet. Please try again shortly.'
      );
    } finally {
      setBusyEpisode(null);
    }
  }

  async function toggleNfc(next: boolean) {
    try {
      setBusyNfc(true);
      const res = await fetch(`/api/custom-stories/${props.orderId}/request-nfc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested: next }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Could not update NFC request');
      }
      setNfcRequested(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update NFC request');
    } finally {
      setBusyNfc(false);
    }
  }

  async function updateVisibility(next: 'public' | 'private') {
    if (!props.storySlug) return;
    try {
      setBusyVisibility(true);
      const res = await fetch(`/api/custom-stories/${props.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not update visibility');
      setVisibility(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update visibility');
    } finally {
      setBusyVisibility(false);
    }
  }

  async function deleteOrder() {
    const confirmed = window.confirm(
      'Delete this custom story order from your account list? This will not delete story content.'
    );
    if (!confirmed) return;
    try {
      setBusyDelete(true);
      const res = await fetch(`/api/custom-stories/${props.orderId}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string' ? json.error : 'Could not delete this custom story order'
        );
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not delete this custom story order');
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <article className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
          {props.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          {hasDraft ? (
            <Link
              href={draftHref}
              className="inline-flex max-w-full rounded-md text-lg font-bold text-slate-900 underline-offset-4 hover:underline focus-visible:underline"
            >
              <span className="truncate">
                {props.storyTitle ?? 'Generating your story...'}
              </span>
            </Link>
          ) : (
            <h3 className="truncate text-lg font-bold text-slate-900">
              {props.storyTitle ?? 'Generating your story...'}
            </h3>
          )}
          <p className="text-sm text-slate-600">
            Package: {props.packageLabel} • Status: <span className="font-semibold">{props.status}</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-rose-600">
            Price: {formatUsdFromCents(props.currentPriceCents)}
          </p>
          {props.totalEpisodes > 0 ? (
            <p
              className={`mt-1 text-xs font-semibold ${
                productionIncomplete ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {productionIncomplete
                ? `Production incomplete: ${missingAudioEpisodes} episode${missingAudioEpisodes === 1 ? '' : 's'} missing MP3.`
                : 'Production complete: all episode MP3 files are ready.'}
            </p>
          ) : null}
          {props.storySlug ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Visibility: {visibility}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {hasDraft ? (
              <Link
                href={draftHref}
                className="rounded-full bg-violet-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"
              >
                {props.storyTitle ? 'Edit' : 'Edit draft'}
              </Link>
            ) : null}
            {props.storySlug ? (
              <Link
                href={`/story/${props.storySlug}`}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"
              >
                Play
              </Link>
            ) : null}
            {props.coverUrl ? (
              <a
                href={props.coverUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
              >
                Download cover
              </a>
            ) : null}
            <button
              type="button"
              disabled={busyNfc}
              onClick={() => void toggleNfc(!nfcRequested)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-50"
            >
              {nfcRequested ? 'NFC requested' : 'Order NFC card'}
            </button>
            {props.storySlug ? (
              <button
                type="button"
                disabled={busyVisibility}
                onClick={() =>
                  void updateVisibility(visibility === 'public' ? 'private' : 'public')
                }
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-50"
              >
                {visibility === 'public' ? 'Make private' : 'Make public'}
              </button>
            ) : null}
            <button
              type="button"
              disabled={busyDelete}
              onClick={() => void deleteOrder()}
              className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700 disabled:opacity-50"
            >
              {busyDelete ? 'Deleting...' : 'Delete'}
            </button>
          </div>
          {episodeNotice ? (
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {episodeNotice}
            </p>
          ) : null}
          {props.episodes.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {props.episodes.map((episode) => (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => void openEpisodeAudio(episode.id)}
                  disabled={busyEpisode === episode.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700"
                >
                  <span>
                    Episode {episode.episodeNumber}: {episode.title}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {busyEpisode === episode.id ? 'Loading...' : 'Download MP3'}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
