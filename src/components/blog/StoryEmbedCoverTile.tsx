'use client';

import Link from 'next/link';
import { Play, Pause } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';
import { hasStoryEmbedAudio } from '@/lib/blog/parse-story-embed-dom';

export function StoryEmbedCoverTile({
  embed,
  className = '',
}: {
  embed: StoryEmbedAttrs;
  className?: string;
}) {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showAudio = hasStoryEmbedAudio(embed);
  const href = `/story/${encodeURIComponent(embed.storySlug)}`;
  const showCover = embed.showCover && Boolean(embed.coverUrl);

  useEffect(() => {
    if (!showAudio) return;
    let cancelled = false;
    setLoadingAudio(true);
    setAudioError(false);
    setAudioSrc(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/audio/play?slug=${encodeURIComponent(embed.storySlug)}&episodeNumber=${encodeURIComponent(String(embed.episodeNumber))}`
        );
        const data = (await res.json()) as { url?: string };
        if (cancelled) return;
        if (res.ok && data.url) setAudioSrc(data.url);
        else setAudioError(true);
      } catch {
        if (!cancelled) setAudioError(true);
      } finally {
        if (!cancelled) setLoadingAudio(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [embed.storySlug, embed.episodeNumber, showAudio]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, [audioSrc]);

  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!audioSrc || !audioRef.current) return;
      if (playing) audioRef.current.pause();
      else void audioRef.current.play();
    },
    [audioSrc, playing]
  );

  if (!showCover) {
    return (
      <Link
        href={href}
        className={`font-drama text-base font-semibold text-neutral-900 underline-offset-2 hover:underline ${className}`}
      >
        {embed.storyTitle.trim() || embed.storySlug}
      </Link>
    );
  }

  return (
    <div className={`group relative ${className}`}>
      <Link
        href={href}
        className="block overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        aria-label={embed.storyTitle.trim() || embed.storySlug}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={embed.coverUrl}
          alt=""
          className="aspect-[3/4] w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
        />
      </Link>

      {showAudio ? (
        <>
          {audioSrc ? (
            <audio ref={audioRef} src={audioSrc} preload="metadata" className="hidden" />
          ) : null}
          <button
            type="button"
            onClick={togglePlay}
            disabled={!audioSrc || loadingAudio || audioError}
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={playing ? 'Pause sample' : 'Play sample'}
            title={
              audioError
                ? 'Playback unavailable'
                : playing
                  ? 'Pause'
                  : 'Play sample'
            }
          >
            {loadingAudio ? (
              <span className="h-4 w-4 animate-pulse rounded-full bg-white/80" />
            ) : playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
            )}
          </button>
        </>
      ) : null}
    </div>
  );
}
