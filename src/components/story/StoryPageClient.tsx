'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronLeft,
  Play,
  Pause,
  ListMusic,
} from 'lucide-react';
import {
  canPlayEpisode,
  needsSubscriptionForEpisode,
} from '@/lib/audioEntitlement';
import type { StoryForPlayer } from '@/lib/stories';
import { getTranscriptLines } from '@/lib/transcripts';
import SubscriptionGate from '@/components/auth/SubscriptionGate';

function mediaErrorMessage(el: HTMLAudioElement | null): string {
  const code = el?.error?.code;
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return 'Audio format or source not supported';
  }
  if (code === MediaError.MEDIA_ERR_NETWORK) {
    return 'Network error loading audio';
  }
  if (code === MediaError.MEDIA_ERR_DECODE) {
    return 'Could not decode audio';
  }
  return 'Could not load audio file';
}

/** Wait until the element can play (or timeout) to avoid play() races right after src updates. */
function waitForAudioReady(
  el: HTMLAudioElement,
  timeoutMs: number
): Promise<void> {
  if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      el.removeEventListener('canplay', onReady);
      el.removeEventListener('error', onReady);
      resolve();
    }, timeoutMs);
    function onReady() {
      window.clearTimeout(timer);
      el.removeEventListener('canplay', onReady);
      el.removeEventListener('error', onReady);
      resolve();
    }
    el.addEventListener('canplay', onReady, { once: true });
    el.addEventListener('error', onReady, { once: true });
  });
}

function skipIntroStorageKey(slug: string): string {
  return `storyThemeSkipIntro:${slug}`;
}

type MainStreamKind = 'intro' | 'episode';

export function StoryPageClient({
  story,
  isSubscribed,
}: {
  story: StoryForPlayer;
  isSubscribed: boolean;
}) {
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [mainStream, setMainStream] = useState<MainStreamKind>('episode');
  const [skipIntroPref, setSkipIntroPref] = useState(false);
  const [fullPlaying, setFullPlaying] = useState(false);
  const [fullProgress, setFullProgress] = useState(0);
  const [fullDuration, setFullDuration] = useState(0);
  const [resolvedThemeIntroSrc, setResolvedThemeIntroSrc] = useState<
    string | null
  >(null);
  const [resolvedThemeFullSrc, setResolvedThemeFullSrc] = useState<
    string | null
  >(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadEpisodeRef = useRef<HTMLAudioElement>(null);
  const fullAudioRef = useRef<HTMLAudioElement>(null);
  const introDoneForEpisodeRef = useRef(false);
  const playEpisodeAfterIntroRef = useRef(false);
  const transcriptScrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const pendingPlayIntroRef = useRef(false);

  const activeEpisode = story.episodes[activeEpisodeIndex];

  const needsPaywall = !!(
    activeEpisode &&
    needsSubscriptionForEpisode(
      story.isPremium,
      activeEpisode.isPremium,
      activeEpisode.isFreePreview
    )
  );

  const entitled = !!(
    activeEpisode &&
    canPlayEpisode(
      story.isPremium,
      activeEpisode.isPremium,
      activeEpisode.isFreePreview,
      isSubscribed
    )
  );

  const locked = !entitled;

  const effectiveThemeIntroSrc =
    story.themeIntroSrc ?? resolvedThemeIntroSrc;
  const effectiveThemeFullSrc = story.themeFullSrc ?? resolvedThemeFullSrc;

  const showIntroChrome =
    entitled && story.hasIntroTheme && !!effectiveThemeIntroSrc;
  const showFullThemeBar =
    entitled && story.hasFullTheme && !!effectiveThemeFullSrc;

  useEffect(() => {
    setResolvedThemeIntroSrc(null);
    setResolvedThemeFullSrc(null);
  }, [story.slug]);

  useEffect(() => {
    if (!entitled || !story.hasIntroTheme || story.themeIntroSrc) {
      setResolvedThemeIntroSrc(null);
      return;
    }
    if (!story.themeIntroUseSignedPlayback) {
      setResolvedThemeIntroSrc(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/theme-audio/play?slug=${encodeURIComponent(story.slug)}&kind=intro`,
      { credentials: 'same-origin' }
    )
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { url?: string };
        if (cancelled) return;
        if (r.ok && data.url) setResolvedThemeIntroSrc(data.url);
        else setResolvedThemeIntroSrc(null);
      })
      .catch(() => {
        if (!cancelled) setResolvedThemeIntroSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    entitled,
    story.slug,
    story.hasIntroTheme,
    story.themeIntroSrc,
    story.themeIntroUseSignedPlayback,
  ]);

  useEffect(() => {
    if (!entitled || !story.hasFullTheme || story.themeFullSrc) {
      setResolvedThemeFullSrc(null);
      return;
    }
    if (!story.themeFullUseSignedPlayback) {
      setResolvedThemeFullSrc(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/theme-audio/play?slug=${encodeURIComponent(story.slug)}&kind=full`,
      { credentials: 'same-origin' }
    )
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { url?: string };
        if (cancelled) return;
        if (r.ok && data.url) setResolvedThemeFullSrc(data.url);
        else setResolvedThemeFullSrc(null);
      })
      .catch(() => {
        if (!cancelled) setResolvedThemeFullSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    entitled,
    story.slug,
    story.hasFullTheme,
    story.themeFullSrc,
    story.themeFullUseSignedPlayback,
  ]);

  const transcriptLines = useMemo(
    () =>
      story && activeEpisode
        ? getTranscriptLines(story.slug, activeEpisode.episodeNumber)
        : [],
    [story, activeEpisode]
  );

  useEffect(() => {
    try {
      setSkipIntroPref(
        localStorage.getItem(skipIntroStorageKey(story.slug)) === '1'
      );
    } catch {
      setSkipIntroPref(false);
    }
  }, [story.slug]);

  useEffect(() => {
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    pendingPlayIntroRef.current = false;
    playEpisodeAfterIntroRef.current = false;
    introDoneForEpisodeRef.current = false;
    setMainStream('episode');
  }, [activeEpisodeIndex, story.slug]);

  useEffect(() => {
    if (!activeEpisode) return;
    let cancelled = false;

    if (!entitled) {
      setResolvedAudioSrc(null);
      setAudioLoading(false);
      setAudioError(null);
      return;
    }

    if (
      activeEpisode.useSignedPlayback &&
      activeEpisode.playbackEpisodeId
    ) {
      setAudioLoading(true);
      setAudioError(null);
      setResolvedAudioSrc(null);
      fetch(
        `/api/audio/play?episodeId=${encodeURIComponent(activeEpisode.playbackEpisodeId)}`,
        { credentials: 'same-origin' }
      )
        .then(async (r) => {
          const data = (await r.json().catch(() => ({}))) as {
            error?: string;
            url?: string;
          };
          if (cancelled) return;
          if (!r.ok) {
            setAudioError(data.error || 'Could not load audio');
            setResolvedAudioSrc(null);
            return;
          }
          if (data.url) setResolvedAudioSrc(data.url);
          else setAudioError('No audio URL returned');
        })
        .catch(() => {
          if (!cancelled) setAudioError('Could not load audio');
        })
        .finally(() => {
          if (!cancelled) setAudioLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    setResolvedAudioSrc(activeEpisode.audioSrc);
    setAudioLoading(false);
    setAudioError(null);
    return () => {
      cancelled = true;
    };
  }, [
    entitled,
    activeEpisode,
    activeEpisodeIndex,
    story.slug,
    isSubscribed,
    story.isPremium,
  ]);

  useEffect(() => {
    if (!locked) return;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    const f = fullAudioRef.current;
    if (f) {
      f.pause();
      f.currentTime = 0;
    }
    setFullPlaying(false);
    setFullProgress(0);
    setFullDuration(0);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, [locked, activeEpisodeIndex, story.slug]);

  const currentLineIndex = useMemo(() => {
    if (mainStream === 'intro') return 0;
    if (!transcriptLines.length || !duration) return 0;
    const currentTime = (progress / 100) * duration;
    const normalized = currentTime / duration;
    return Math.min(
      transcriptLines.length - 1,
      Math.max(0, Math.floor(normalized * transcriptLines.length))
    );
  }, [mainStream, progress, duration, transcriptLines.length]);

  useLayoutEffect(() => {
    if (mainStream === 'intro') return;
    const container = transcriptScrollerRef.current;
    const activeLine = lineRefs.current[currentLineIndex];
    if (!showTranscript || !container || !transcriptLines.length || !activeLine)
      return;
    const lineRect = activeLine.getBoundingClientRect();
    const boxRect = container.getBoundingClientRect();
    const relTop = lineRect.top - boxRect.top + container.scrollTop;
    const targetTop = relTop - container.clientHeight * 0.38;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [
    mainStream,
    currentLineIndex,
    showTranscript,
    transcriptLines.length,
    activeEpisode?.id,
  ]);

  useEffect(() => {
    if (!playEpisodeAfterIntroRef.current) return;
    if (mainStream !== 'episode') return;
    if (!resolvedAudioSrc || !entitled) return;
    playEpisodeAfterIntroRef.current = false;
    const el = audioRef.current;
    if (!el) return;
    const f = fullAudioRef.current;
    if (f && !f.paused) {
      f.pause();
      setFullPlaying(false);
    }
    void waitForAudioReady(el, 10_000)
      .then(() => el.play())
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.log('Episode autoplay after intro:', err);
        setIsPlaying(false);
      });
  }, [mainStream, resolvedAudioSrc, entitled]);

  useEffect(() => {
    if (!pendingPlayIntroRef.current) return;
    if (mainStream !== 'intro') return;
    const src = effectiveThemeIntroSrc;
    if (!src) return;
    pendingPlayIntroRef.current = false;
    const el = audioRef.current;
    if (!el) return;
    void waitForAudioReady(el, 10_000)
      .then(() => el.play())
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.log('Intro playback could not start:', err);
        setIsPlaying(false);
      });
  }, [mainStream, effectiveThemeIntroSrc]);

  if (!activeEpisode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-slate-600">No episodes for this story.</p>
      </div>
    );
  }

  const canUsePlayer =
    entitled && !audioLoading && !!resolvedAudioSrc && !audioError;
  const introBlockingPlay =
    story.hasIntroTheme &&
    !skipIntroPref &&
    !effectiveThemeIntroSrc &&
    !introDoneForEpisodeRef.current;
  const playDisabled = locked || !canUsePlayer || introBlockingPlay;

  const mainAudioSrc =
    entitled && !audioError
      ? mainStream === 'intro' && effectiveThemeIntroSrc
        ? effectiveThemeIntroSrc
        : canUsePlayer && resolvedAudioSrc
          ? resolvedAudioSrc
          : undefined
      : undefined;

  const pauseFullTheme = () => {
    const f = fullAudioRef.current;
    if (f && !f.paused) {
      f.pause();
      setFullPlaying(false);
    }
  };

  const handleMainAudioError = () => {
    setAudioError(
      mainStream === 'intro'
        ? 'Could not load theme intro'
        : mediaErrorMessage(audioRef.current)
    );
    setIsPlaying(false);
  };

  const handleMainEnded = () => {
    if (mainStream === 'intro' && resolvedAudioSrc) {
      introDoneForEpisodeRef.current = true;
      playEpisodeAfterIntroRef.current = true;
      setMainStream('episode');
      return;
    }
    setIsPlaying(false);
  };

  const persistSkipIntro = (checked: boolean) => {
    setSkipIntroPref(checked);
    try {
      if (checked) {
        localStorage.setItem(skipIntroStorageKey(story.slug), '1');
      } else {
        localStorage.removeItem(skipIntroStorageKey(story.slug));
      }
    } catch {
      /* ignore */
    }
    if (checked && mainStream === 'intro') {
      introDoneForEpisodeRef.current = true;
      playEpisodeAfterIntroRef.current = true;
      audioRef.current?.pause();
      setAudioError(null);
      setMainStream('episode');
    }
  };

  const togglePlay = async () => {
    if (playDisabled) return;
    const el = audioRef.current;
    if (!el) return;

    pauseFullTheme();

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }

    const shouldStartIntro =
      story.hasIntroTheme &&
      !!effectiveThemeIntroSrc &&
      !skipIntroPref &&
      !introDoneForEpisodeRef.current;

    if (shouldStartIntro) {
      if (mainStream === 'intro' && el.paused) {
        try {
          await waitForAudioReady(el, 10_000);
          await el.play();
          setIsPlaying(true);
        } catch (error) {
          console.log('Intro resume:', error);
          setIsPlaying(false);
        }
        return;
      }
      pendingPlayIntroRef.current = true;
      setMainStream('intro');
      return;
    }

    setMainStream('episode');
    try {
      await waitForAudioReady(el, 10_000);
      await el.play();
      setIsPlaying(true);
    } catch (error) {
      console.log('Playback could not start yet:', error);
      setIsPlaying(false);
    }
  };

  const toggleFullTheme = async () => {
    const f = fullAudioRef.current;
    if (!f || !effectiveThemeFullSrc) return;
    if (fullPlaying) {
      f.pause();
      setFullPlaying(false);
      return;
    }
    const main = audioRef.current;
    if (main && !main.paused) {
      main.pause();
      setIsPlaying(false);
    }
    try {
      await waitForAudioReady(f, 10_000);
      await f.play();
      setFullPlaying(true);
    } catch (err) {
      console.log('Full theme playback:', err);
      setFullPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime || 0;
    const total = audioRef.current.duration || 0;
    setProgress(total ? (current / total) * 100 : 0);
    if (Number.isFinite(total) && total > 0) {
      setDuration((d) => (d > 0 ? d : total));
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleFullTimeUpdate = () => {
    const f = fullAudioRef.current;
    if (!f) return;
    const current = f.currentTime || 0;
    const total = f.duration || 0;
    setFullProgress(total ? (current / total) * 100 : 0);
    if (Number.isFinite(total) && total > 0) {
      setFullDuration((d) => (d > 0 ? d : total));
    }
  };

  const handleFullLoadedMetadata = () => {
    const f = fullAudioRef.current;
    if (!f) return;
    setFullDuration(f.duration || 0);
  };

  const handleFullSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!effectiveThemeFullSrc) return;
    const f = fullAudioRef.current;
    if (!f) return;
    const value = Number(e.target.value);
    const total = f.duration || fullDuration;
    f.currentTime = total ? (value / 100) * total : 0;
    setFullProgress(value);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (playDisabled) return;
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
                  isPremium={needsPaywall}
                  isSubscribed={isSubscribed}
                >
                  <div className="flex w-full flex-col gap-3">
                    {entitled && audioLoading ? (
                      <p className="text-center text-xs text-white/80">
                        Preparing audio…
                      </p>
                    ) : null}
                    {entitled && audioError ? (
                      <p className="text-center text-xs text-rose-200">
                        {audioError}
                      </p>
                    ) : null}
                    <audio
                      ref={preloadEpisodeRef}
                      src={
                        canUsePlayer && resolvedAudioSrc
                          ? resolvedAudioSrc
                          : undefined
                      }
                      preload="auto"
                      className="pointer-events-none absolute h-0 w-0 opacity-0"
                      aria-hidden
                      muted
                    />
                    <audio
                      key={`main-${activeEpisode.id}-${mainStream}-${
                        mainStream === 'intro'
                          ? 'intro'
                          : (resolvedAudioSrc ?? 'none')
                      }`}
                      ref={audioRef}
                      src={mainAudioSrc}
                      preload="auto"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleMainEnded}
                      onError={mainAudioSrc ? handleMainAudioError : undefined}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={progress}
                      onChange={handleSeek}
                      disabled={playDisabled}
                      className={`h-2 w-full appearance-none rounded-full bg-white/25 accent-rose-400 ${
                        playDisabled
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
                        disabled={playDisabled}
                        className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-900/20 transition ${
                          playDisabled
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

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
            <div className="flex items-center gap-3">
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
                Transcript
              </label>
            </div>
            {showIntroChrome ? (
              <div className="flex items-center gap-3">
                <input
                  id={`skip-intro-${story.slug}`}
                  type="checkbox"
                  checked={skipIntroPref}
                  onChange={(e) => persistSkipIntro(e.target.checked)}
                  className="switch"
                />
                <label
                  htmlFor={`skip-intro-${story.slug}`}
                  className="cursor-pointer text-sm font-medium text-slate-600"
                >
                  Skip intro music
                </label>
              </div>
            ) : null}
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

              {showFullThemeBar ? (
                <div className="mb-4 mt-5 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Series theme
                    </span>
                    <span className="text-[11px] text-slate-400">Full track</span>
                  </div>
                  <audio
                    ref={fullAudioRef}
                    src={effectiveThemeFullSrc ?? undefined}
                    preload="metadata"
                    onTimeUpdate={handleFullTimeUpdate}
                    onLoadedMetadata={handleFullLoadedMetadata}
                    onEnded={() => setFullPlaying(false)}
                    onPlay={() => setFullPlaying(true)}
                    onPause={() => setFullPlaying(false)}
                    className="hidden"
                    aria-hidden
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void toggleFullTheme()}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm transition hover:bg-teal-600"
                      aria-label={
                        fullPlaying ? 'Pause series theme' : 'Play series theme'
                      }
                    >
                      {fullPlaying ? (
                        <Pause className="h-4 w-4 fill-current" />
                      ) : (
                        <Play className="ml-0.5 h-4 w-4 fill-current" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={fullProgress}
                        onChange={handleFullSeek}
                        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-500"
                      />
                      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
                        <span>
                          {formatTime(
                            fullDuration ? (fullProgress / 100) * fullDuration : 0
                          )}
                        </span>
                        <span>{formatTime(fullDuration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

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
                          {episode.isFreePreview ? (
                            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                              Free preview
                            </p>
                          ) : null}
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
