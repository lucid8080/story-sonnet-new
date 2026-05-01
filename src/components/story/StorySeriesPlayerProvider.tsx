'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { StoryForPlayer } from '@/lib/stories';
import { canPlayEpisode } from '@/lib/audioEntitlement';
import {
  mediaErrorMessage,
  sameOriginPlaceholderAudioUrl,
  waitForAudioReady,
} from '@/lib/storyPlayerAudio';

export type MainStreamKind = 'intro' | 'episode' | 'fullTheme';
export type PlaybackSelection = 'episode' | 'fullTheme';

function skipIntroStorageKey(slug: string): string {
  return `storyThemeSkipIntro:${slug}`;
}

export type StorySeriesPlayerContextValue = {
  story: StoryForPlayer | null;
  isSubscribed: boolean;
  /** True after user has started playback at least once for the current slug (drives header mini player). */
  playbackSessionActive: boolean;
  activeEpisodeIndex: number;
  setActiveEpisodeIndex: (index: number) => void;
  isPlaying: boolean;
  progress: number;
  duration: number;
  themeFullDurationSec: number;
  resolvedAudioSrc: string | null;
  audioLoading: boolean;
  audioError: string | null;
  mainStream: MainStreamKind;
  playbackSelection: PlaybackSelection;
  skipIntroPref: boolean;
  persistSkipIntro: (checked: boolean) => void;
  resolvedThemeIntroSrc: string | null;
  resolvedThemeFullSrc: string | null;
  usingPlaceholderAudio: boolean;
  entitled: boolean;
  locked: boolean;
  effectiveThemeIntroSrc: string | null;
  effectiveThemeFullSrc: string | null;
  showIntroChrome: boolean;
  showFullThemeBar: boolean;
  episodeCanUsePlayer: boolean;
  themeCanUsePlayer: boolean;
  introBlockingPlay: boolean;
  technicalPlayBlocked: boolean;
  scrubberDisabled: boolean;
  mainPlayButtonDisabled: boolean;
  mainAudioSrc: string | undefined;
  togglePlay: () => Promise<void>;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTimeUpdate: () => void;
  handleLoadedMetadata: () => void;
  handleMainEnded: () => void;
  handleMainAudioError: () => void;
  selectFullTheme: () => void;
  selectEpisodeIndex: (index: number) => void;
  /** Call from story page when `story` / subscription props change. */
  syncStoryFromPage: (story: StoryForPlayer, isSubscribed: boolean) => void;
  /**
   * Take over the global player with this story (pause prior audio, reset state).
   * Call when the user starts playback from a story page while another story was still active.
   */
  claimStorySession: (
    nextStory: StoryForPlayer,
    isSubscribed: boolean,
    opts?: {
      initialEpisodeIndex?: number;
      initialPlaybackSelection?: PlaybackSelection;
    }
  ) => void;
  /** Marquee / header: series title – episode num – title (or theme label). */
  headerNowPlayingText: string;
};

const StorySeriesPlayerContext =
  createContext<StorySeriesPlayerContextValue | null>(null);

export function useStorySeriesPlayer(): StorySeriesPlayerContextValue | null {
  return useContext(StorySeriesPlayerContext);
}

export function StorySeriesPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [story, setStory] = useState<StoryForPlayer | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [playbackSessionActive, setPlaybackSessionActive] = useState(false);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [themeFullDurationSec, setThemeFullDurationSec] = useState(0);
  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string | null>(
    null
  );
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
  const [usingPlaceholderAudio, setUsingPlaceholderAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadEpisodeRef = useRef<HTMLAudioElement>(null);
  const introDoneForEpisodeRef = useRef(false);
  const playEpisodeAfterIntroRef = useRef(false);
  const pendingPlayIntroRef = useRef(false);
  const usedEpisodePlaceholderFallbackRef = useRef(false);
  const usedIntroPlaceholderFallbackRef = useRef(false);
  const prevSlugForSyncRef = useRef<string | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const playbackSessionActiveRef = useRef(playbackSessionActive);
  /** After episode audio ends, advance index then call `togglePlay` when load/unblocked. */
  const continueAfterEpisodeEndedRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    playbackSessionActiveRef.current = playbackSessionActive;
  }, [playbackSessionActive]);

  const activeEpisode = story?.episodes[activeEpisodeIndex];

  const entitled = !!(
    story &&
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
    story?.themeIntroSrc ?? resolvedThemeIntroSrc ?? null;
  const effectiveThemeFullSrc =
    story?.themeFullSrc ?? resolvedThemeFullSrc ?? null;

  const showIntroChrome =
    entitled &&
    Boolean(story?.hasIntroTheme) &&
    !!effectiveThemeIntroSrc;
  const showFullThemeBar =
    entitled && Boolean(story?.hasFullTheme) && !!effectiveThemeFullSrc;

  /** Stable identity for hook deps (avoid `story` object identity churn from sync). */
  const storyKey = story ? `${story.id}:${story.slug}` : '';

  const activeEpPlaybackId = activeEpisode?.playbackEpisodeId ?? null;
  const activeEpEpisodeNumber = activeEpisode?.episodeNumber ?? null;

  /**
   * Episode identity for the signed-URL fetch effect. Using this instead of the
   * `activeEpisode` object avoids clearing `resolvedAudioSrc` (and stopping playback)
   * when `syncStoryFromPage` merges a fresh `story` payload with the same episode.
   */
  const activeEpisodeAudioKey = useMemo(() => {
    if (!storyKey) return '';
    if (activeEpPlaybackId) {
      return `${storyKey}|id:${activeEpPlaybackId}`;
    }
    if (activeEpEpisodeNumber != null) {
      return `${storyKey}|n:${activeEpEpisodeNumber}`;
    }
    return `${storyKey}|i:${activeEpisodeIndex}`;
  }, [storyKey, activeEpisodeIndex, activeEpPlaybackId, activeEpEpisodeNumber]);

  const replaceSessionWithStory = useCallback(
    (
      nextStory: StoryForPlayer,
      sub: boolean,
      opts?: {
        initialEpisodeIndex?: number;
        initialPlaybackSelection?: PlaybackSelection;
      }
    ) => {
      const nextSlug = nextStory.slug;
      const epCount = nextStory.episodes.length;
      const rawIdx = opts?.initialEpisodeIndex ?? 0;
      const idx =
        epCount > 0
          ? Math.max(0, Math.min(rawIdx, epCount - 1))
          : 0;
      const playSel = opts?.initialPlaybackSelection ?? 'episode';
      const mainStr: MainStreamKind =
        playSel === 'fullTheme' ? 'fullTheme' : 'episode';

      prevSlugForSyncRef.current = nextSlug;
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
      setStory(nextStory);
      setIsSubscribed(sub);
      setPlaybackSessionActive(false);
      setActiveEpisodeIndex(idx);
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);
      setThemeFullDurationSec(0);
      setResolvedAudioSrc(null);
      setAudioLoading(false);
      setAudioError(null);
      setMainStream(mainStr);
      setPlaybackSelection(playSel);
      setResolvedThemeIntroSrc(null);
      setResolvedThemeFullSrc(null);
      setUsingPlaceholderAudio(false);
      pendingPlayIntroRef.current = false;
      playEpisodeAfterIntroRef.current = false;
      introDoneForEpisodeRef.current = false;
      continueAfterEpisodeEndedRef.current = false;
      usedEpisodePlaceholderFallbackRef.current = false;
      usedIntroPlaceholderFallbackRef.current = false;
      try {
        setSkipIntroPref(
          localStorage.getItem(skipIntroStorageKey(nextSlug)) === '1'
        );
      } catch {
        setSkipIntroPref(false);
      }
    },
    []
  );

  const claimStorySession = useCallback(
    (
      nextStory: StoryForPlayer,
      sub: boolean,
      opts?: {
        initialEpisodeIndex?: number;
        initialPlaybackSelection?: PlaybackSelection;
      }
    ) => {
      replaceSessionWithStory(nextStory, sub, opts);
    },
    [replaceSessionWithStory]
  );

  const syncStoryFromPage = useCallback(
    (nextStory: StoryForPlayer, sub: boolean) => {
      const prevSlug = prevSlugForSyncRef.current;
      const nextSlug = nextStory.slug;

      if (prevSlug === nextSlug) {
        setStory(nextStory);
        setIsSubscribed(sub);
        return;
      }

      /**
       * Another story page opened while something is already playing: keep the
       * current session until the user explicitly plays from the new page.
       */
      if (
        prevSlug !== null &&
        (playbackSessionActiveRef.current || isPlayingRef.current)
      ) {
        return;
      }

      replaceSessionWithStory(nextStory, sub);
    },
    [replaceSessionWithStory]
  );

  useEffect(() => {
    if (!story) return;
    try {
      setSkipIntroPref(
        localStorage.getItem(skipIntroStorageKey(story.slug)) === '1'
      );
    } catch {
      setSkipIntroPref(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `story` read via storyKey
  }, [storyKey]);

  useEffect(() => {
    setResolvedThemeIntroSrc(null);
    setResolvedThemeFullSrc(null);
  }, [storyKey]);

  useEffect(() => {
    if (!story || !entitled || !story.hasIntroTheme || story.themeIntroSrc) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `story` read via storyKey
  }, [
    entitled,
    storyKey,
    story?.hasIntroTheme,
    story?.themeIntroSrc,
    story?.themeIntroUseSignedPlayback,
  ]);

  useEffect(() => {
    if (!story || !entitled || !story.hasFullTheme || story.themeFullSrc) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `story` read via storyKey
  }, [
    entitled,
    storyKey,
    story?.hasFullTheme,
    story?.themeFullSrc,
    story?.themeFullUseSignedPlayback,
  ]);

  useEffect(() => {
    setThemeFullDurationSec(0);
    if (!story || !entitled || !story.hasFullTheme || !effectiveThemeFullSrc) {
      return;
    }
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = effectiveThemeFullSrc;
    const onLoadedMetadata = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) {
        setThemeFullDurationSec(d);
      }
    };
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeAttribute('src');
      audio.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `story` read via storyKey
  }, [entitled, storyKey, story?.hasFullTheme, effectiveThemeFullSrc]);

  useEffect(() => {
    if (!story) return;
    /** Only skip forcing episode stream when both point at full theme (e.g. after claimSession fullTheme). */
    const listeningFullTheme =
      playbackSelection === 'fullTheme' && mainStream === 'fullTheme';
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    pendingPlayIntroRef.current = false;
    playEpisodeAfterIntroRef.current = false;
    introDoneForEpisodeRef.current = false;
    usedEpisodePlaceholderFallbackRef.current = false;
    usedIntroPlaceholderFallbackRef.current = false;
    setUsingPlaceholderAudio(false);
    if (!listeningFullTheme) {
      setMainStream('episode');
      setPlaybackSelection('episode');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `story` read via storyKey
  }, [activeEpisodeIndex, storyKey]);

  useEffect(() => {
    if (!story || !activeEpisode) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `story` / `activeEpisode` read in body; identity via activeEpisodeAudioKey
  }, [
    entitled,
    activeEpisodeAudioKey,
    activeEpisodeIndex,
    storyKey,
    isSubscribed,
    story?.isPremium,
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
  }, [locked, activeEpisodeIndex, storyKey]);

  useEffect(() => {
    if (!playEpisodeAfterIntroRef.current) return;
    if (mainStream !== 'episode') return;
    if (!resolvedAudioSrc || !entitled) return;
    playEpisodeAfterIntroRef.current = false;
    const el = audioRef.current;
    if (!el) return;
    void waitForAudioReady(el, 10_000)
      .then(() => el.play())
      .then(() => {
        setIsPlaying(true);
        setPlaybackSessionActive(true);
      })
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
      .then(() => {
        setIsPlaying(true);
        setPlaybackSessionActive(true);
      })
      .catch((err) => {
        console.log('Intro playback could not start:', err);
        setIsPlaying(false);
      });
  }, [mainStream, effectiveThemeIntroSrc]);

  const episodeCanUsePlayer =
    entitled && !audioLoading && !!resolvedAudioSrc && !audioError;
  const themeCanUsePlayer =
    entitled && !!effectiveThemeFullSrc && !audioError;
  const introBlockingPlay =
    playbackSelection === 'episode' &&
    Boolean(story?.hasIntroTheme) &&
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

  const handleMainAudioError = useCallback(() => {
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
  }, [mainStream]);

  const handleMainEnded = useCallback(() => {
    if (mainStream === 'intro' && resolvedAudioSrc) {
      introDoneForEpisodeRef.current = true;
      playEpisodeAfterIntroRef.current = true;
      setMainStream('episode');
      return;
    }
    if (mainStream === 'episode' && story) {
      const episodes = story.episodes;
      for (let i = activeEpisodeIndex + 1; i < episodes.length; i++) {
        const ep = episodes[i];
        if (
          canPlayEpisode(
            story.isPremium,
            ep.isPremium,
            ep.isFreePreview,
            isSubscribed
          )
        ) {
          continueAfterEpisodeEndedRef.current = true;
          setIsPlaying(false);
          setActiveEpisodeIndex(i);
          return;
        }
      }
    }
    setIsPlaying(false);
  }, [
    mainStream,
    resolvedAudioSrc,
    story,
    activeEpisodeIndex,
    isSubscribed,
  ]);

  const persistSkipIntro = useCallback(
    (checked: boolean) => {
      if (!story) return;
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
    },
    [story, mainStream]
  );

  const togglePlay = useCallback(async () => {
    if (locked || technicalPlayBlocked || !story) return;
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
        setPlaybackSessionActive(true);
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
          setPlaybackSessionActive(true);
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
      setPlaybackSessionActive(true);
    } catch (error) {
      console.log('Playback could not start yet:', error);
      setIsPlaying(false);
    }
  }, [
    locked,
    technicalPlayBlocked,
    story,
    isPlaying,
    playbackSelection,
    effectiveThemeIntroSrc,
    skipIntroPref,
    mainStream,
  ]);

  useEffect(() => {
    if (!continueAfterEpisodeEndedRef.current) return;
    if (!story) {
      continueAfterEpisodeEndedRef.current = false;
      return;
    }
    if (locked) {
      continueAfterEpisodeEndedRef.current = false;
      return;
    }
    if (technicalPlayBlocked) return;
    continueAfterEpisodeEndedRef.current = false;
    void togglePlay();
  }, [story, locked, technicalPlayBlocked, togglePlay]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime || 0;
    const total = audioRef.current.duration || 0;
    setProgress(total ? (current / total) * 100 : 0);
    if (Number.isFinite(total) && total > 0) {
      setDuration((d) => (d > 0 ? d : total));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (scrubberDisabled) return;
      if (!audioRef.current) return;
      const value = Number(e.target.value);
      const newTime = duration ? (value / 100) * duration : 0;
      audioRef.current.currentTime = newTime;
      setProgress(value);
    },
    [scrubberDisabled, duration]
  );

  const selectFullTheme = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setAudioError(null);
    setPlaybackSelection('fullTheme');
    setMainStream('fullTheme');
    setProgress(0);
    setDuration(0);
  }, []);

  const selectEpisodeIndex = useCallback(
    (index: number) => {
      const needReset =
        playbackSelection === 'fullTheme' || mainStream === 'fullTheme';
      if (needReset) {
        audioRef.current?.pause();
        setIsPlaying(false);
        setProgress(0);
        setDuration(0);
        setPlaybackSelection('episode');
        setMainStream('episode');
      } else {
        setPlaybackSelection('episode');
      }
      setActiveEpisodeIndex(index);
    },
    [playbackSelection, mainStream]
  );

  const headerNowPlayingText = useMemo(() => {
    if (!story) return '';
    if (playbackSelection === 'fullTheme') {
      return `${story.seriesTitle} – Series theme music`;
    }
    const ep = story.episodes[activeEpisodeIndex];
    if (!ep) return story.seriesTitle;
    return `${story.seriesTitle} – ${ep.episodeNumber} ${ep.title}`;
  }, [story, playbackSelection, activeEpisodeIndex]);

  const value = useMemo<StorySeriesPlayerContextValue>(
    () => ({
      story,
      isSubscribed,
      playbackSessionActive,
      activeEpisodeIndex,
      setActiveEpisodeIndex,
      isPlaying,
      progress,
      duration,
      themeFullDurationSec,
      resolvedAudioSrc,
      audioLoading,
      audioError,
      mainStream,
      playbackSelection,
      skipIntroPref,
      persistSkipIntro,
      resolvedThemeIntroSrc,
      resolvedThemeFullSrc,
      usingPlaceholderAudio,
      entitled,
      locked,
      effectiveThemeIntroSrc,
      effectiveThemeFullSrc,
      showIntroChrome,
      showFullThemeBar,
      episodeCanUsePlayer,
      themeCanUsePlayer,
      introBlockingPlay,
      technicalPlayBlocked,
      scrubberDisabled,
      mainPlayButtonDisabled,
      mainAudioSrc,
      togglePlay,
      handleSeek,
      handleTimeUpdate,
      handleLoadedMetadata,
      handleMainEnded,
      handleMainAudioError,
      selectFullTheme,
      selectEpisodeIndex,
      syncStoryFromPage,
      claimStorySession,
      headerNowPlayingText,
    }),
    [
    story,
    isSubscribed,
    playbackSessionActive,
    activeEpisodeIndex,
    isPlaying,
    progress,
    duration,
    themeFullDurationSec,
    resolvedAudioSrc,
    audioLoading,
    audioError,
    mainStream,
    playbackSelection,
    skipIntroPref,
    persistSkipIntro,
    resolvedThemeIntroSrc,
    resolvedThemeFullSrc,
    usingPlaceholderAudio,
    entitled,
    locked,
    effectiveThemeIntroSrc,
    effectiveThemeFullSrc,
    showIntroChrome,
    showFullThemeBar,
    episodeCanUsePlayer,
    themeCanUsePlayer,
    introBlockingPlay,
    technicalPlayBlocked,
    scrubberDisabled,
    mainPlayButtonDisabled,
    mainAudioSrc,
    togglePlay,
    handleSeek,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleMainEnded,
    handleMainAudioError,
    selectFullTheme,
      selectEpisodeIndex,
      syncStoryFromPage,
      claimStorySession,
      headerNowPlayingText,
    ]
  );

  return (
    <StorySeriesPlayerContext.Provider value={value}>
      <audio
        ref={preloadEpisodeRef}
        src={
          episodeCanUsePlayer && resolvedAudioSrc ? resolvedAudioSrc : undefined
        }
        preload="auto"
        className="pointer-events-none fixed h-0 w-0 opacity-0"
        aria-hidden
        muted
      />
      <audio
        ref={audioRef}
        src={mainAudioSrc}
        preload="auto"
        className="pointer-events-none fixed h-0 w-0 opacity-0"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => {
          setIsPlaying(true);
          setPlaybackSessionActive(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleMainEnded}
        onError={mainAudioSrc ? handleMainAudioError : undefined}
      />
      {children}
    </StorySeriesPlayerContext.Provider>
  );
}
