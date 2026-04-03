'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Play,
  Pause,
  ListMusic,
} from 'lucide-react';
import type { AppStory } from '@/lib/stories';
import { getTranscriptLines } from '@/lib/transcripts';
import SubscriptionGate from '@/components/auth/SubscriptionGate';

export function StoryPageClient({
  story,
  isSubscribed,
}: {
  story: AppStory;
  isSubscribed: boolean;
}) {
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptScrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const activeEpisode = story.episodes[activeEpisodeIndex];
  const episodePremium = !!(
    activeEpisode &&
    (activeEpisode.isPremium || story.isPremium)
  );
  const locked = episodePremium && !isSubscribed;

  const transcriptLines = useMemo(
    () =>
      story && activeEpisode
        ? getTranscriptLines(story.slug, activeEpisode.id)
        : [],
    [story, activeEpisode]
  );

  useEffect(() => {
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    lineRefs.current = [];
  }, [activeEpisodeIndex, story.slug]);

  useEffect(() => {
    if (!locked) return;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, [locked, activeEpisodeIndex, story.slug]);

  const currentLineIndex = useMemo(() => {
    if (!transcriptLines.length || !duration) return 0;
    const currentTime = (progress / 100) * duration;
    const normalized = currentTime / duration;
    return Math.min(
      transcriptLines.length - 1,
      Math.max(0, Math.floor(normalized * transcriptLines.length))
    );
  }, [progress, duration, transcriptLines.length]);

  useEffect(() => {
    if (!showTranscript || !transcriptScrollerRef.current || !transcriptLines.length)
      return;
    const container = transcriptScrollerRef.current;
    const activeLine = lineRefs.current[currentLineIndex];
    if (!activeLine) return;
    const targetTop = activeLine.offsetTop - container.clientHeight * 0.38;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [currentLineIndex, showTranscript, transcriptLines.length, progress]);

  if (!activeEpisode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-slate-600">No episodes for this story.</p>
      </div>
    );
  }

  const togglePlay = async () => {
    if (locked) return;
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.log('Playback could not start yet:', error);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime || 0;
    const total = audioRef.current.duration || 0;
    setProgress(total ? (current / total) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (locked) return;
    if (!audioRef.current) return;
    const value = Number(e.target.value);
    const newTime = duration ? (value / 100) * duration : 0;
    audioRef.current.currentTime = newTime;
    setProgress(value);
  };

  const formatTime = (time: number) => {
    if (!time || Number.isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50 text-slate-800">
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-5 sm:px-7 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-6">
        <section>
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to library
          </Link>
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-100">
            <div
              className="relative aspect-[4/5] overflow-hidden"
              style={{ backgroundColor: story.accent || '#64748b' }}
            >
              {story.cover && (
                <Image
                  src={story.cover}
                  alt={`${story.title} cover art`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  priority
                  className="object-cover object-top"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-transparent p-5 sm:p-6">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/70">
                      Now Playing
                    </div>
                    <div className="mt-1 text-lg font-black leading-snug text-white sm:text-xl">
                      {activeEpisode.title}
                    </div>
                  </div>
                  <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur">
                    {activeEpisode.duration}
                  </div>
                </div>

                <SubscriptionGate
                  isPremium={episodePremium}
                  isSubscribed={isSubscribed}
                >
                  <div className="flex w-full flex-col gap-3">
                    <audio
                      ref={audioRef}
                      src={
                        locked
                          ? undefined
                          : activeEpisode.audioSrc || undefined
                      }
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={progress}
                      onChange={handleSeek}
                      disabled={locked}
                      className={`h-2 w-full appearance-none rounded-full bg-white/25 accent-rose-400 ${
                        locked
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer'
                      }`}
                    />
                    <div className="flex justify-between text-[11px] font-mono text-white/75">
                      <span>
                        {formatTime(duration ? (progress / 100) * duration : 0)}
                      </span>
                      <span>{formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={togglePlay}
                        disabled={locked}
                        className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-900/20 transition ${
                          locked
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isPlaying ? (
                          <Pause className="h-7 w-7 fill-current" />
                        ) : (
                          <Play className="ml-1 h-7 w-7 fill-current" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white">
                          Play from the cover
                        </div>
                        <div className="text-xs leading-5 text-white/75">
                          Pick an episode on the right, then hit play here.
                        </div>
                      </div>
                    </div>
                  </div>
                </SubscriptionGate>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 px-1">
            <input
              id="transcript-toggle"
              type="checkbox"
              checked={showTranscript}
              onChange={(e) => setShowTranscript(e.target.checked)}
              className="switch"
            />
            <label
              htmlFor="transcript-toggle"
              className="cursor-pointer text-sm font-medium text-slate-600"
            >
              Auto-scrolling transcript
            </label>
          </div>
        </section>

        <section>
          {showTranscript && transcriptLines.length > 0 ? (
            <div className="aspect-[4/5] self-start overflow-hidden rounded-[1.6rem] bg-white shadow-lg ring-1 ring-slate-100">
              <div className="flex h-full flex-col p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">
                      Transcript
                    </div>
                    <h2 className="mt-2 text-2xl font-black leading-tight text-slate-900">
                      {activeEpisode.title}
                    </h2>
                  </div>
                  <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-rose-500">
                    Live Follow
                  </div>
                </div>
                <div
                  ref={transcriptScrollerRef}
                  className="mt-2 flex-1 overflow-y-auto scroll-smooth pr-2"
                >
                  <div className="space-y-4 pb-24">
                    {transcriptLines.map((line, index) => (
                      <p
                        key={line.id}
                        ref={(el) => {
                          lineRefs.current[index] = el;
                        }}
                        className="text-[15px] leading-7 text-slate-700"
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-[1.6rem] bg-white p-5 shadow-lg ring-1 ring-slate-100">
                <div className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">
                  Story Series
                </div>
                <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900 lg:text-[2.1rem]">
                  {story.seriesTitle}
                </h1>
                {story.subtitle ? (
                  <p className="mt-2 text-lg font-semibold text-slate-700">
                    {story.subtitle}
                  </p>
                ) : null}
                {story.seriesTagline ? (
                  <p className="mt-2 text-sm font-medium italic text-violet-700/90">
                    {story.seriesTagline}
                  </p>
                ) : null}
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {story.summary}
                </p>
                {story.fullDescription ? (
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {story.fullDescription}
                  </p>
                ) : null}
              </div>

              <div className="mb-4 mt-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                  <ListMusic className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Episodes</h2>
                  <p className="text-sm text-slate-500">
                    Choose an episode and play it from the cover.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {story.episodes.map((episode, index) => {
                  const active = index === activeEpisodeIndex;
                  return (
                    <button
                      type="button"
                      key={episode.id}
                      onClick={() => setActiveEpisodeIndex(index)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                        active
                          ? 'border-rose-200 bg-white shadow-lg shadow-rose-100'
                          : 'border-slate-100 bg-white/70 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            {episode.label}
                          </div>
                          <div className="mt-1 text-lg font-black leading-snug text-slate-900">
                            {episode.title}
                          </div>
                          {episode.description && (
                            <p className="mt-2 text-sm leading-5 text-slate-600">
                              {episode.description}
                            </p>
                          )}
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                            active
                              ? 'bg-rose-50 text-rose-500'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {episode.duration}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
