'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Image as ImageIcon,
  Info,
  Play,
  Pause,
  ListMusic,
  Music,
} from 'lucide-react';
import { canPlayEpisode } from '@/lib/audioEntitlement';
import type { StoryForPlayer } from '@/lib/stories';
import { getTranscriptLines } from '@/lib/transcripts';
import {
  StoryEngagementProvider,
  StorySeriesLibraryButton,
  StorySeriesCommentsPanel,
} from '@/components/story/StorySeriesEngagement';
import { EpisodeDescriptionModal } from '@/components/story/EpisodeDescriptionModal';

function sameOriginPlaceholderAudioUrl(): string {
  return new URL('/api/audio/placeholder', window.location.origin).href;
}

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

type MainStreamKind = 'intro' | 'episode' | 'fullTheme';

type PlaybackSelection = 'episode' | 'fullTheme';

const EPISODE_WINDOW_SIZE = 3;

type RecommendedStory = {
  slug: string;
  title: string;
  cover: string | null;
  accent: string | null;
};

function canCollapseText(
  text: string | null | undefined,
  minChars: number
): boolean {
  return !!text && text.trim().length > minChars;
}

export function StoryPageClient({
  story,
  isSignedIn,
  isSubscribed,
  recommendedStories,
}: {
  story: StoryForPlayer;
  isSignedIn: boolean;
  isSubscribed: boolean;
  recommendedStories: RecommendedStory[];
}) {
  const router = useRouter();
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [mainStream, setMainStream] = useState<MainStreamKind>('episode');
  const [playbackSelection, setPlaybackSelection] =
    useState<PlaybackSelection>('episode');
  const [skipIntroPref, setSkipIntroPref] = useState(false);
  const [resolvedThemeIntroSrc, setResolvedThemeIntroSrc] = useState<
    string | null
  >(null);
  const [resolvedThemeFullSrc, setResolvedThemeFullSrc] = useState<
    string | null
  >(null);
  const [isCoverFlipped, setIsCoverFlipped] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isFullDescriptionExpanded, setIsFullDescriptionExpanded] =
    useState(false);
  const [episodeDescriptionModal, setEpisodeDescriptionModal] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const episodeReadMoreReturnFocusRef = useRef<HTMLElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadEpisodeRef = useRef<HTMLAudioElement>(null);
  const introDoneForEpisodeRef = useRef(false);
  const playEpisodeAfterIntroRef = useRef(false);
  const transcriptScrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const pendingPlayIntroRef = useRef(false);
  const usedEpisodePlaceholderFallbackRef = useRef(false);
  const usedIntroPlaceholderFallbackRef = useRef(false);
  const [usingPlaceholderAudio, setUsingPlaceholderAudio] = useState(false);
  const [episodeWindowStart, setEpisodeWindowStart] = useState(0);

  const activeEpisode = story.episodes[activeEpisodeIndex];
  const episodeCount = story.episodes.length;
  const maxEpisodeWindowStart = Math.max(0, episodeCount - EPISODE_WINDOW_SIZE);
  const useEpisodeWindow = episodeCount > EPISODE_WINDOW_SIZE;
  const visibleEpisodeIndices = useMemo(() => {
    if (!useEpisodeWindow) {
      return story.episodes.map((_, i) => i);
    }
    const out: number[] = [];
    for (
      let i = episodeWindowStart;
      i < episodeWindowStart + EPISODE_WINDOW_SIZE && i < episodeCount;
      i += 1
    ) {
      out.push(i);
    }
    return out;
  }, [episodeCount, episodeWindowStart, story.episodes, useEpisodeWindow]);

  useEffect(() => {
    setEpisodeWindowStart(0);
    setIsCoverFlipped(false);
    setIsSummaryExpanded(false);
    setIsFullDescriptionExpanded(false);
    setEpisodeDescriptionModal(null);
  }, [story.slug]);

  useEffect(() => {
    if (!useEpisodeWindow) return;
    setEpisodeWindowStart((prev) => {
      if (
        activeEpisodeIndex >= prev &&
        activeEpisodeIndex < prev + EPISODE_WINDOW_SIZE
      ) {
        return prev;
      }
      return Math.min(
        Math.max(0, activeEpisodeIndex - EPISODE_WINDOW_SIZE + 1),
        maxEpisodeWindowStart
      );
    });
  }, [activeEpisodeIndex, maxEpisodeWindowStart, useEpisodeWindow]);

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
        if (r.ok && data.url) {
          setResolvedThemeIntroSrc(data.url);
          return;
        }
        setUsingPlaceholderAudio(true);
        setResolvedThemeIntroSrc(sameOriginPlaceholderAudioUrl());
      })
      .catch(() => {
        if (!cancelled) {
          setUsingPlaceholderAudio(true);
          setResolvedThemeIntroSrc(sameOriginPlaceholderAudioUrl());
        }
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
        if (r.ok && data.url) {
          setResolvedThemeFullSrc(data.url);
          return;
        }
        setUsingPlaceholderAudio(true);
        setResolvedThemeFullSrc(sameOriginPlaceholderAudioUrl());
      })
      .catch(() => {
        if (!cancelled) {
          setUsingPlaceholderAudio(true);
          setResolvedThemeFullSrc(sameOriginPlaceholderAudioUrl());
        }
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

  const transcriptLines = useMemo(() => {
    if (!story || !activeEpisode) return [];
    const fromDb = activeEpisode.transcriptLines;
    if (fromDb && fromDb.length > 0) return fromDb;
    return getTranscriptLines(story.slug, activeEpisode.episodeNumber);
  }, [story, activeEpisode]);

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
    usedEpisodePlaceholderFallbackRef.current = false;
    usedIntroPlaceholderFallbackRef.current = false;
    setUsingPlaceholderAudio(false);
    setMainStream('episode');
    setPlaybackSelection('episode');
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
            setUsingPlaceholderAudio(true);
            setResolvedAudioSrc(sameOriginPlaceholderAudioUrl());
            setAudioError(null);
            return;
          }
          if (data.url) {
            setResolvedAudioSrc(data.url);
            return;
          }
          setUsingPlaceholderAudio(true);
          setResolvedAudioSrc(sameOriginPlaceholderAudioUrl());
          setAudioError(null);
        })
        .catch(() => {
          if (!cancelled) {
            setUsingPlaceholderAudio(true);
            setResolvedAudioSrc(sameOriginPlaceholderAudioUrl());
            setAudioError(null);
          }
        })
        .finally(() => {
          if (!cancelled) setAudioLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    setAudioLoading(true);
    setAudioError(null);
    setResolvedAudioSrc(null);
    fetch(
      `/api/audio/play?slug=${encodeURIComponent(story.slug)}&episodeNumber=${encodeURIComponent(String(activeEpisode.episodeNumber))}`,
      { credentials: 'same-origin' }
    )
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
        };
        if (cancelled) return;
        if (r.ok && data.url) {
          setUsingPlaceholderAudio(false);
          setResolvedAudioSrc(data.url);
          setAudioError(null);
          return;
        }
        const direct = activeEpisode.audioSrc?.trim();
        if (direct) {
          setUsingPlaceholderAudio(false);
          setResolvedAudioSrc(direct);
          setAudioError(null);
          return;
        }
        setUsingPlaceholderAudio(true);
        setResolvedAudioSrc(sameOriginPlaceholderAudioUrl());
        setAudioError(null);
      })
      .catch(() => {
        if (cancelled) return;
        const direct = activeEpisode.audioSrc?.trim();
        if (direct) {
          setUsingPlaceholderAudio(false);
          setResolvedAudioSrc(direct);
          setAudioError(null);
          return;
        }
        setUsingPlaceholderAudio(true);
        setResolvedAudioSrc(sameOriginPlaceholderAudioUrl());
        setAudioError(null);
      })
      .finally(() => {
        if (!cancelled) setAudioLoading(false);
      });
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
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, [locked, activeEpisodeIndex, story.slug]);

  const currentLineIndex = useMemo(() => {
    if (mainStream === 'intro' || mainStream === 'fullTheme') return 0;
    if (!transcriptLines.length || !duration) return 0;
    const currentTime = (progress / 100) * duration;
    const normalized = currentTime / duration;
    return Math.min(
      transcriptLines.length - 1,
      Math.max(0, Math.floor(normalized * transcriptLines.length))
    );
  }, [mainStream, progress, duration, transcriptLines.length]);

  useLayoutEffect(() => {
    if (mainStream === 'intro' || mainStream === 'fullTheme') return;
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

  const episodeCanUsePlayer =
    entitled && !audioLoading && !!resolvedAudioSrc && !audioError;
  const themeCanUsePlayer =
    entitled && !!effectiveThemeFullSrc && !audioError;
  const introBlockingPlay =
    playbackSelection === 'episode' &&
    story.hasIntroTheme &&
    !skipIntroPref &&
    !effectiveThemeIntroSrc &&
    !introDoneForEpisodeRef.current;
  const technicalPlayBlocked =
    playbackSelection === 'episode'
      ? !episodeCanUsePlayer || introBlockingPlay
      : !themeCanUsePlayer;
  const scrubberDisabled = locked || technicalPlayBlocked;
  const mainPlayButtonDisabled = locked ? false : technicalPlayBlocked;

  const mainAudioSrc =
    entitled && !audioError
      ? mainStream === 'intro' && effectiveThemeIntroSrc
        ? effectiveThemeIntroSrc
        : mainStream === 'fullTheme' && effectiveThemeFullSrc
          ? effectiveThemeFullSrc
          : episodeCanUsePlayer && resolvedAudioSrc
            ? resolvedAudioSrc
            : undefined
      : undefined;

  const handleMainAudioError = () => {
    const el = audioRef.current;
    const errCode = el?.error?.code ?? null;

    const tryIntroPlaceholder =
      mainStream === 'intro' &&
      !usedIntroPlaceholderFallbackRef.current &&
      (errCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
        errCode === MediaError.MEDIA_ERR_NETWORK ||
        errCode === MediaError.MEDIA_ERR_DECODE);

    if (tryIntroPlaceholder) {
      usedIntroPlaceholderFallbackRef.current = true;
      setUsingPlaceholderAudio(true);
      setResolvedThemeIntroSrc(sameOriginPlaceholderAudioUrl());
      setAudioError(null);
      return;
    }

    if (mainStream === 'fullTheme') {
      setAudioError('Could not load series theme');
      setIsPlaying(false);
      return;
    }

    const tryPlaceholder =
      mainStream === 'episode' &&
      !usedEpisodePlaceholderFallbackRef.current &&
      (errCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
        errCode === MediaError.MEDIA_ERR_NETWORK ||
        errCode === MediaError.MEDIA_ERR_DECODE);

    if (tryPlaceholder) {
      usedEpisodePlaceholderFallbackRef.current = true;
      setUsingPlaceholderAudio(true);
      setAudioError(null);
      setResolvedAudioSrc(sameOriginPlaceholderAudioUrl());
      return;
    }

    setAudioError(
      mainStream === 'intro'
        ? 'Could not load theme intro'
        : mediaErrorMessage(el)
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
    if (locked || technicalPlayBlocked) return;
    const el = audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }

    if (playbackSelection === 'fullTheme') {
      setMainStream('fullTheme');
      try {
        await waitForAudioReady(el, 10_000);
        await el.play();
        setIsPlaying(true);
      } catch (error) {
        console.log('Full theme playback:', error);
        setIsPlaying(false);
      }
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

  const handleCoverPlayClick = () => {
    if (locked) {
      const path = `/story/${story.slug}`;
      if (isSignedIn) {
        router.push(`/pricing?callbackUrl=${encodeURIComponent(path)}`);
      } else {
        router.push(`/signup?callbackUrl=${encodeURIComponent(path)}`);
      }
      return;
    }
    void togglePlay();
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (scrubberDisabled) return;
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
    <StoryEngagementProvider storySlug={story.slug}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50 text-slate-800">
        <main className="mx-auto grid max-w-6xl gap-8 px-5 py-5 sm:px-7 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-6">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to library
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCoverFlipped((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-sm ring-1 transition ${
                  isCoverFlipped
                    ? 'bg-sky-100 text-sky-800 ring-sky-200'
                    : 'bg-white/90 text-slate-700 ring-slate-200 hover:bg-white'
                }`}
                aria-pressed={isCoverFlipped}
                aria-label="Toggle Story Series details on cover card"
              >
                {isCoverFlipped ? (
                  <>
                    <ImageIcon className="h-4 w-4" aria-hidden />
                    Show Cover
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4" aria-hidden />
                    About
                  </>
                )}
              </button>
              <StorySeriesLibraryButton />
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-100 [perspective:1200px]">
            <div
              className={`relative aspect-[4/5] transition-transform duration-500 motion-reduce:duration-0 [transform-style:preserve-3d] ${
                isCoverFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div
                  className="relative h-full w-full overflow-hidden"
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
                          {playbackSelection === 'fullTheme'
                            ? 'Series theme music'
                            : activeEpisode.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3">
                        {entitled &&
                        playbackSelection === 'episode' &&
                        audioLoading ? (
                          <p className="text-center text-xs text-white/80">
                            Preparing audio…
                          </p>
                        ) : null}
                        {entitled && audioError ? (
                          <p className="text-center text-xs text-rose-200">
                            {audioError}
                          </p>
                        ) : null}
                        {entitled &&
                        playbackSelection === 'episode' &&
                        usingPlaceholderAudio &&
                        !audioError ? (
                          <p className="text-center text-xs text-amber-100/95">
                            Placeholder audio — upload the MP3 or fix the CDN path
                            when ready.
                          </p>
                        ) : null}
                        <audio
                          ref={preloadEpisodeRef}
                          src={
                            episodeCanUsePlayer && resolvedAudioSrc
                              ? resolvedAudioSrc
                              : undefined
                          }
                          preload="auto"
                          className="pointer-events-none absolute h-0 w-0 opacity-0"
                          aria-hidden
                          muted
                        />
                        <audio
                          key={`main-${activeEpisode.id}-${playbackSelection}-${mainStream}-${
                            mainStream === 'intro'
                              ? 'intro'
                              : mainStream === 'fullTheme'
                                ? `theme-${effectiveThemeFullSrc ?? 'none'}`
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
                          disabled={scrubberDisabled}
                          className={`h-2 w-full appearance-none rounded-full bg-white/25 accent-rose-400 ${
                            scrubberDisabled
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer'
                          }`}
                        />
                        <div className="flex justify-between text-[11px] font-mono text-white/75">
                          <span>
                            {formatTime(
                              duration ? (progress / 100) * duration : 0
                            )}
                          </span>
                          <span>{formatTime(duration)}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={handleCoverPlayClick}
                            disabled={mainPlayButtonDisabled}
                            className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-900/20 transition ${
                              mainPlayButtonDisabled
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
                  </div>
                </div>
              </div>

              <div
                className="absolute inset-0 overflow-hidden rounded-[2rem] bg-white"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">
                      Story Series
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCoverFlipped(false)}
                      className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      aria-label="Flip back to cover"
                    >
                      Back to Cover
                    </button>
                  </div>
                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    <h1 className="text-2xl font-black leading-tight text-slate-900">
                      {story.seriesTitle}
                    </h1>
                    {story.subtitle ? (
                      <p className="mt-2 text-base font-semibold text-slate-700">
                        {story.subtitle}
                      </p>
                    ) : null}
                    {story.seriesTagline ? (
                      <p className="mt-2 text-sm font-medium italic text-violet-700/90">
                        {story.seriesTagline}
                      </p>
                    ) : null}
                    <p
                      className={`mt-3 text-base leading-7 text-slate-600 ${
                        isSummaryExpanded ? '' : 'line-clamp-3'
                      }`}
                    >
                      {story.summary}
                    </p>
                    {canCollapseText(story.summary, 150) ? (
                      <button
                        type="button"
                        onClick={() => setIsSummaryExpanded((prev) => !prev)}
                        className="mt-1 text-sm font-semibold text-violet-700 hover:text-violet-800"
                        aria-expanded={isSummaryExpanded}
                      >
                        {isSummaryExpanded ? 'Show less' : 'Read more'}
                      </button>
                    ) : null}
                    {story.fullDescription ? (
                      <p
                        className={`mt-4 text-sm leading-7 text-slate-600 ${
                          isFullDescriptionExpanded ? '' : 'line-clamp-3'
                        }`}
                      >
                        {story.fullDescription}
                      </p>
                    ) : null}
                    {canCollapseText(story.fullDescription, 150) ? (
                      <button
                        type="button"
                        onClick={() =>
                          setIsFullDescriptionExpanded((prev) => !prev)
                        }
                        className="mt-1 text-sm font-semibold text-violet-700 hover:text-violet-800"
                        aria-expanded={isFullDescriptionExpanded}
                      >
                        {isFullDescriptionExpanded ? 'Show less' : 'Read more'}
                      </button>
                    ) : null}
                  </div>
                </div>
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
              <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
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
                {useEpisodeWindow ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setEpisodeWindowStart((s) => Math.max(0, s - 1))
                        }
                        disabled={episodeWindowStart <= 0}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Show earlier episodes"
                      >
                        <ChevronUp className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEpisodeWindowStart((s) =>
                            Math.min(maxEpisodeWindowStart, s + 1)
                          )
                        }
                        disabled={episodeWindowStart >= maxEpisodeWindowStart}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Show later episodes"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {episodeWindowStart + 1}–
                      {Math.min(
                        episodeWindowStart + EPISODE_WINDOW_SIZE,
                        episodeCount
                      )}{' '}
                      of {episodeCount}
                    </span>
                  </div>
                ) : null}
              </div>

              <ul className="divide-y divide-slate-100" aria-live="polite">
                {showFullThemeBar ? (
                  <li className="py-1">
                    <div
                      className={`rounded-lg px-1 py-2 transition ${
                        playbackSelection === 'fullTheme'
                          ? 'bg-rose-50/80 ring-1 ring-rose-100/80'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          audioRef.current?.pause();
                          setIsPlaying(false);
                          setAudioError(null);
                          setPlaybackSelection('fullTheme');
                          setMainStream('fullTheme');
                          setProgress(0);
                          setDuration(0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            audioRef.current?.pause();
                            setIsPlaying(false);
                            setAudioError(null);
                            setPlaybackSelection('fullTheme');
                            setMainStream('fullTheme');
                            setProgress(0);
                            setDuration(0);
                          }
                        }}
                        className="flex w-full items-center gap-3 rounded-md py-0 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                        aria-label="Select series theme music (play from cover)"
                        aria-current={
                          playbackSelection === 'fullTheme'
                            ? 'true'
                            : undefined
                        }
                      >
                        <span className="flex w-7 shrink-0 items-center justify-end">
                          <Music
                            className="h-4 w-4 shrink-0 text-slate-400"
                            aria-hidden
                          />
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">
                            Series theme music
                          </span>
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Full track
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-500">
                          {playbackSelection === 'fullTheme' && duration > 0
                            ? formatTime(duration)
                            : '—'}
                        </span>
                      </button>
                    </div>
                  </li>
                ) : null}
                {visibleEpisodeIndices.map((index) => {
                  const episode = story.episodes[index];
                  const active =
                    playbackSelection === 'episode' &&
                    index === activeEpisodeIndex;
                  const desc = episode.description?.trim() ?? '';
                  const hasReadMore = desc.length > 0;
                  const durationLabel = episode.duration?.trim() || '—';
                  const selectEpisodeFromTracklist = () => {
                    if (
                      playbackSelection === 'fullTheme' ||
                      mainStream === 'fullTheme'
                    ) {
                      setPlaybackSelection('episode');
                      setMainStream('episode');
                      audioRef.current?.pause();
                      setIsPlaying(false);
                      setProgress(0);
                      setDuration(0);
                    } else {
                      setPlaybackSelection('episode');
                    }
                    setActiveEpisodeIndex(index);
                  };
                  return (
                    <li key={episode.id} className="py-1">
                      <div
                        className={`flex w-full items-center gap-2 rounded-lg px-1 py-2 transition ${
                          active
                            ? 'bg-rose-50/80 ring-1 ring-rose-100/80'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={selectEpisodeFromTracklist}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              selectEpisodeFromTracklist();
                            }
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-0 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                          aria-current={active ? 'true' : undefined}
                          aria-label={`Select episode ${episode.episodeNumber}: ${episode.title}`}
                        >
                          <span className="w-7 shrink-0 text-right text-xs font-bold tabular-nums text-slate-400">
                            {episode.episodeNumber}
                          </span>
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">
                              {episode.title}
                            </span>
                            {episode.isFreePreview ? (
                              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                Preview
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {hasReadMore ? (
                          <button
                            type="button"
                            className="shrink-0 whitespace-nowrap text-[11px] font-medium text-violet-600 hover:text-violet-800 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                            aria-label={`Read full description: ${episode.title}`}
                            onClick={(e) => {
                              episodeReadMoreReturnFocusRef.current =
                                e.currentTarget;
                              setEpisodeDescriptionModal({
                                title: episode.title,
                                description: desc,
                              });
                            }}
                          >
                            Read more
                          </button>
                        ) : null}
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          onClick={selectEpisodeFromTracklist}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              selectEpisodeFromTracklist();
                            }
                          }}
                          className="shrink-0 rounded-md px-0.5 tabular-nums text-sm font-semibold text-slate-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                        >
                          {durationLabel}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
        </main>

        <div
          className={`mx-auto max-w-6xl px-5 sm:px-7 lg:px-8 ${
            recommendedStories.length > 0 ? 'pb-6' : 'pb-12'
          }`}
        >
          <StorySeriesCommentsPanel className="mt-2" />
        </div>

        {recommendedStories.length > 0 ? (
          <div className="mx-auto mt-6 max-w-6xl px-5 pb-12 sm:px-7 lg:px-8">
            <section className="w-full">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-slate-900">
                  Recommended Stories
                </h2>
              </div>
              <ul
                className="m-0 flex list-none flex-row flex-nowrap gap-3 overflow-x-auto overflow-y-hidden px-0 pt-0 pb-2 snap-x snap-mandatory sm:gap-4"
              >
                {recommendedStories.map((recommended) => (
                  <li
                    key={recommended.slug}
                    className="shrink-0 snap-start"
                  >
                    <Link
                      href={`/story/${recommended.slug}`}
                      className="group block w-[42vw] max-w-[9.5rem] overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:max-w-[10.5rem]"
                      aria-label={`Open recommended story: ${recommended.title}`}
                    >
                      <div
                        className="relative aspect-[3/4] w-full overflow-hidden"
                        style={{
                          backgroundColor: recommended.accent || '#cbd5e1',
                        }}
                      >
                        {recommended.cover ? (
                          <Image
                            src={recommended.cover}
                            alt={`${recommended.title} cover art`}
                            fill
                            sizes="(max-width: 640px) 42vw, 168px"
                            className="object-cover object-top transition duration-300 group-hover:scale-105"
                          />
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        <EpisodeDescriptionModal
          open={episodeDescriptionModal != null}
          title={episodeDescriptionModal?.title ?? ''}
          description={episodeDescriptionModal?.description ?? ''}
          onClose={() => setEpisodeDescriptionModal(null)}
          returnFocusRef={episodeReadMoreReturnFocusRef}
        />
      </div>
    </StoryEngagementProvider>
  );
}
