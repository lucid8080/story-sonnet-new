'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { StoryEmbedAudioMode } from '@/components/admin/blog/storyEmbedExtension';

export function BlogStoryEmbed({
  storySlug,
  storyTitle,
  coverUrl,
  showCover,
  audioMode,
  episodeNumber,
}: {
  storySlug: string;
  storyTitle: string;
  coverUrl: string;
  showCover: boolean;
  audioMode: StoryEmbedAudioMode;
  episodeNumber: number | null;
}) {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const showAudio =
    audioMode !== 'none' && episodeNumber != null && Number.isFinite(episodeNumber);
  const href = `/story/${encodeURIComponent(storySlug)}`;

  useEffect(() => {
    if (!showAudio) return;

    let cancelled = false;
    setAudioSrc(null);
    setAudioError(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/audio/play?slug=${encodeURIComponent(storySlug)}&episodeNumber=${encodeURIComponent(String(episodeNumber))}`
        );
        const data = (await res.json()) as { url?: string; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setAudioError(data.error ?? 'Playback unavailable');
          return;
        }
        if (data.url) setAudioSrc(data.url);
        else setAudioError('Playback unavailable');
      } catch {
        if (!cancelled) setAudioError('Playback unavailable');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storySlug, episodeNumber, showAudio]);

  return (
    <div className="story-embed-card not-prose my-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      {showCover && coverUrl ? (
        <Link href={href} className="mb-3 block max-w-[200px] overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            className="aspect-[3/4] w-full object-cover"
          />
        </Link>
      ) : null}

      <Link
        href={href}
        className="font-drama text-lg font-semibold text-neutral-900 hover:underline"
      >
        {storyTitle.trim() || storySlug}
      </Link>

      {showAudio ? (
        <div className="mt-3">
          {audioSrc ? (
            <audio controls className="w-full" src={audioSrc} preload="metadata" />
          ) : null}
          {audioError ? (
            <p className="mt-2 text-sm text-neutral-600">
              {audioError}.{' '}
              <Link href={href} className="font-semibold text-violet-600">
                Open story
              </Link>
            </p>
          ) : null}
          {showAudio && !audioSrc && !audioError ? (
            <p className="mt-2 text-sm text-neutral-500">Loading audio…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
