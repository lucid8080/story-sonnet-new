'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Image as ImageIcon,
  Info,
  Play,
  Pause,
  ListMusic,
  Loader2,
  Music,
} from 'lucide-react';
import {
  canPlayEpisode,
  episodeRequiresAccount,
  paywallRedirectHref,
} from '@/lib/audioEntitlement';
import type { StoryForPlayer } from '@/lib/stories';
import type { PlaybackSelection } from '@/components/story/StorySeriesPlayerProvider';
import { getTranscriptLines } from '@/lib/transcripts';
import {
  StoryEngagementProvider,
  StorySeriesLibraryButton,
  StorySeriesCommentsPanel,
} from '@/components/story/StorySeriesEngagement';
import { EpisodeDescriptionModal } from '@/components/story/EpisodeDescriptionModal';
import { EpisodeAmazonBookLink } from '@/components/story/EpisodeAmazonBookLink';
import { useStorySeriesPlayer } from '@/components/story/StorySeriesPlayerProvider';
import type {
  StorySpotlightBadgeDTO,
  StorySpotlightInfoBarDTO,
} from '@/lib/content-spotlight/types';
import { SpotlightBadgeOverlay } from '@/components/spotlight/SpotlightBadgeOverlay';
import { SpotlightInfoBar } from '@/components/spotlight/SpotlightInfoBar';
import { StoryNarratorLine } from '@/components/narrators/StoryNarratorLine';
import type { ThemeAudioProbeResult } from '@/lib/themeAudioUrls';
import {
  storyShowsIntroTheme,
  storyShowsSeriesTheme,
  storyWithThemeForViewer,
} from '@/lib/storyThemeClient';

type SeriesThemeLoadState = 'loading' | 'ready' | 'none';

/** Episodes track list: Full track / Preview / Read more share typography; color is per-label. */
const TRACKLIST_LABEL_CLASS =
  'hidden shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.18em] sm:inline';

/** Episode title in track list: wrap on narrow viewports; single-line truncate from sm up. */
const TRACKLIST_TITLE_CLASS =
  'min-w-0 flex-1 text-base font-bold leading-snug text-slate-900 line-clamp-2 sm:line-clamp-1 sm:truncate';

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

function skipIntroStorageKey(slug: string): string {
  return `storyThemeSkipIntro:${slug}`;
}

export function StoryPageClient({
  story: initialStory,
  isLoggedIn,
  isSubscribed,
  recommendedStories,
  spotlightBadge,
  spotlightInfoBar,
}: {
  story: StoryForPlayer;
  isLoggedIn: boolean;
  isSubscribed: boolean;
  recommendedStories: RecommendedStory[];
  spotlightBadge?: StorySpotlightBadgeDTO | null;
  spotlightInfoBar?: StorySpotlightInfoBarDTO | null;
}) {
  const router = useRouter();
  const player = useStorySeriesPlayer()!;
  const [story, setStory] = useState(initialStory);
  const [seriesThemeLoad, setSeriesThemeLoad] =
    useState<SeriesThemeLoadState>('loading');
  const storyRef = useRef(story);
  storyRef.current = story;

  useEffect(() => {
    setStory(initialStory);
    setSeriesThemeLoad('loading');
  }, [initialStory]);

  useEffect(() => {
    let cancelled = false;
    setSeriesThemeLoad('loading');
    fetch(`/api/theme-audio/probe?slug=${encodeURIComponent(initialStory.slug)}`, {
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as ThemeAudioProbeResult;
      })
      .then(async (probe) => {
        if (cancelled) return;
        if (!probe?.hasFullTheme && !probe?.hasIntroTheme) {
          setSeriesThemeLoad('none');
          return;
        }
        const merged = await storyWithThemeForViewer(
          initialStory,
          probe,
          isSubscribed,
          isLoggedIn
        );
        if (cancelled) return;
        setStory(merged);
        storyRef.current = merged;
        player.syncStoryFromPage(merged, isSubscribed, isLoggedIn);
        setSeriesThemeLoad(merged.hasFullTheme ? 'ready' : 'none');
      })
      .catch(() => {
        if (!cancelled) setSeriesThemeLoad('none');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- probe once per slug; initialStory carries episode payload
  }, [initialStory.slug, isSubscribed, isLoggedIn, player.syncStoryFromPage]);

  useLayoutEffect(() => {
    player.syncStoryFromPage(storyRef.current, isSubscribed, isLoggedIn);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit `player`; syncStoryFromPage is stable
  }, [player.syncStoryFromPage, story.slug, isSubscribed, isLoggedIn]);

  const {
    activeEpisodeIndex,
    isPlaying,
    progress,
    duration,
    themeFullDurationSec,
    audioLoading,
    audioError,
    mainStream,
    playbackSelection,
    skipIntroPref,
    persistSkipIntro,
    usingPlaceholderAudio,
    entitled,
    scrubberDisabled,
    mainPlayButtonDisabled,
    togglePlay,
    handleSeek,
    selectFullTheme,
    selectEpisodeIndex,
    claimStorySession,
    story: playingStory,
  } = player;

  const inSessionWithPage = Boolean(
    playingStory && playingStory.slug === story.slug
  );

  const [previewEpisodeIndex, setPreviewEpisodeIndex] = useState(0);
  const [previewPlaybackSelection, setPreviewPlaybackSelection] =
    useState<PlaybackSelection>('episode');
  const [previewSkipIntro, setPreviewSkipIntro] = useState(false);
  const playAfterClaimRef = useRef(false);

  useEffect(() => {
    playAfterClaimRef.current = false;
    setPreviewEpisodeIndex(0);
    setPreviewPlaybackSelection('episode');
    try {
      setPreviewSkipIntro(
        localStorage.getItem(skipIntroStorageKey(story.slug)) === '1'
      );
    } catch {
      setPreviewSkipIntro(false);
    }
  }, [story.slug]);

  useEffect(() => {
    if (!playAfterClaimRef.current) return;
    if (!inSessionWithPage) return;
    if (mainPlayButtonDisabled) return;
    playAfterClaimRef.current = false;
    void togglePlay();
  }, [
    inSessionWithPage,
    mainPlayButtonDisabled,
    playbackSelection,
    story.slug,
    playingStory?.slug,
    togglePlay,
  ]);

  const persistPreviewSkipIntro = (checked: boolean) => {
    setPreviewSkipIntro(checked);
    try {
      if (checked) {
        localStorage.setItem(skipIntroStorageKey(story.slug), '1');
      } else {
        localStorage.removeItem(skipIntroStorageKey(story.slug));
      }
    } catch {
      /* ignore */
    }
  };

  const [showTranscript, setShowTranscript] = useState(false);
  const [isCoverFlipped, setIsCoverFlipped] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [episodeDescriptionModal, setEpisodeDescriptionModal] = useState<{
    title: string;
    description: string;
    episodeId: string;
    amazonBookUrl: string | null;
  } | null>(null);
  const episodeReadMoreReturnFocusRef = useRef<HTMLElement | null>(null);
  const transcriptScrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const episodeIndexForUi = useMemo(() => {
    const raw = inSessionWithPage ? activeEpisodeIndex : previewEpisodeIndex;
    const n = story.episodes.length;
    if (n === 0) return 0;
    return Math.max(0, Math.min(raw, n - 1));
  }, [
    inSessionWithPage,
    activeEpisodeIndex,
    previewEpisodeIndex,
    story.episodes.length,
  ]);

  const activeEpisode = story.episodes[episodeIndexForUi];
  const episodeCount = story.episodes.length;

  useEffect(() => {
    setIsCoverFlipped(false);
    setIsSummaryExpanded(false);
    setEpisodeDescriptionModal(null);
  }, [story.slug]);

  const transcriptLines = useMemo(() => {
    if (!story || !activeEpisode) return [];
    const fromDb = activeEpisode.transcriptLines;
    if (fromDb && fromDb.length > 0) return fromDb;
    return getTranscriptLines(story.slug, activeEpisode.episodeNumber);
  }, [story, activeEpisode]);

  const currentLineIndex = useMemo(() => {
    if (!inSessionWithPage) return 0;
    if (mainStream === 'intro' || mainStream === 'fullTheme') return 0;
    if (!transcriptLines.length || !duration) return 0;
    const currentTime = (progress / 100) * duration;
    const normalized = currentTime / duration;
    return Math.min(
      transcriptLines.length - 1,
      Math.max(0, Math.floor(normalized * transcriptLines.length))
    );
  }, [
    inSessionWithPage,
    mainStream,
    progress,
    duration,
    transcriptLines.length,
  ]);

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

  if (!activeEpisode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-slate-600">No episodes for this story.</p>
      </div>
    );
  }

  const pageEntitled = !!canPlayEpisode(
    story.isPremium,
    activeEpisode.isPremium,
    activeEpisode.isFreePreview,
    isSubscribed,
    isLoggedIn,
    activeEpisode.isFreePreviewRequiresSignup
  );
  const coverEntitled = inSessionWithPage ? entitled : pageEntitled;
  const coverLocked = !coverEntitled;
  const coverPlaybackSelection = inSessionWithPage
    ? playbackSelection
    : previewPlaybackSelection;

  const showSignupOnlyPreviewNotice =
    !isLoggedIn &&
    activeEpisode.isFreePreview &&
    activeEpisode.isFreePreviewRequiresSignup;

  const showIntroChromeUi =
    seriesThemeLoad === 'loading' || storyShowsIntroTheme(story);

  const showSeriesThemeRow =
    seriesThemeLoad === 'loading' || storyShowsSeriesTheme(story);

  const seriesThemeRowReady =
    seriesThemeLoad === 'ready' && storyShowsSeriesTheme(story);

  const storyPath = `/story/${story.slug}`;

  const redirectForLockedPlayback = () => {
    router.push(paywallRedirectHref(isLoggedIn, storyPath));
  };

  const redirectIfCoverLocked = () => {
    redirectForLockedPlayback();
  };

  const episodeAtIndex = (index: number) => story.episodes[index];

  const isEpisodeLockedAtIndex = (index: number) => {
    const ep = episodeAtIndex(index);
    if (!ep) return true;
    return episodeRequiresAccount(
      story.isPremium,
      ep.isPremium,
      ep.isFreePreview,
      isSubscribed,
      isLoggedIn,
      ep.isFreePreviewRequiresSignup
    );
  };

  const coverScrubberDisabled =
    !inSessionWithPage || scrubberDisabled;
  const coverMainPlayDisabled = inSessionWithPage
    ? mainPlayButtonDisabled
    : !coverEntitled;
  const coverIsPlaying = inSessionWithPage && isPlaying;
  /** Avoid showing another story's playback on this page's scrubber when session is deferred. */
  const coverScrubberProgress = inSessionWithPage ? progress : 0;
  const onSelectEpisodeFromTracklist = (index: number) => {
    if (isEpisodeLockedAtIndex(index)) {
      redirectForLockedPlayback();
      return;
    }
    playAfterClaimRef.current = true;
    if (inSessionWithPage) {
      selectEpisodeIndex(index);
      return;
    }
    setPreviewPlaybackSelection('episode');
    setPreviewEpisodeIndex(index);
    claimStorySession(story, isSubscribed, {
      initialEpisodeIndex: index,
      initialPlaybackSelection: 'episode',
      isLoggedIn,
    });
  };

  const onSelectFullThemeFromTracklist = () => {
    if (!seriesThemeRowReady) return;
    if (coverLocked) {
      redirectIfCoverLocked();
      return;
    }
    playAfterClaimRef.current = true;
    if (inSessionWithPage) {
      selectFullTheme();
      return;
    }
    setPreviewPlaybackSelection('fullTheme');
    claimStorySession(story, isSubscribed, {
      initialPlaybackSelection: 'fullTheme',
      isLoggedIn,
    });
  };

  const handleCoverPlayClick = () => {
    if (isEpisodeLockedAtIndex(episodeIndexForUi)) {
      redirectForLockedPlayback();
      return;
    }
    if (!inSessionWithPage) {
      playAfterClaimRef.current = true;
      claimStorySession(story, isSubscribed, {
        initialEpisodeIndex: previewEpisodeIndex,
        initialPlaybackSelection: previewPlaybackSelection,
        isLoggedIn,
      });
      return;
    }
    void togglePlay();
  };

  const formatTime = (time: number) => {
    if (!time || Number.isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const seriesThemeListDurationSec =
    !inSessionWithPage
      ? 0
      : themeFullDurationSec > 0
        ? themeFullDurationSec
        : playbackSelection === 'fullTheme' && duration > 0
          ? duration
          : 0;
  const seriesThemeListDurationLabel =
    seriesThemeListDurationSec > 0
      ? formatTime(seriesThemeListDurationSec)
      : '—';

  return (
    <StoryEngagementProvider storySlug={story.slug}>
      <div className="min-h-screen w-full overflow-x-clip bg-gradient-to-b from-slate-50 via-white to-violet-50 text-slate-800">
        <main className="mx-auto grid w-full min-w-0 max-w-6xl gap-8 px-5 py-5 sm:px-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:px-8 lg:py-6">
        {spotlightInfoBar ? (
          <div className="lg:col-span-2">
            <SpotlightInfoBar spotlight={spotlightInfoBar} />
          </div>
        ) : null}
        <section className="min-w-0 w-full max-w-full">
          <div className="mb-4 flex items-center justify-end gap-3">
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
          <div className="w-full max-w-full overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-100 [perspective:1200px]">
            <div
              className={`relative aspect-[4/5] w-full max-w-full transition-transform duration-500 motion-reduce:duration-0 [transform-style:preserve-3d] ${
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
                      className="max-w-full object-cover object-top"
                    />
                  )}
                  {spotlightBadge ? (
                    <SpotlightBadgeOverlay spotlight={spotlightBadge} />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-transparent p-5 sm:p-6">
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/70">
                          Now Playing
                        </div>
                        <div className="mt-1 text-lg font-black leading-snug text-white sm:text-xl">
                          {coverPlaybackSelection === 'fullTheme'
                            ? 'Series theme music'
                            : activeEpisode.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3">
                        {coverEntitled &&
                        inSessionWithPage &&
                        playbackSelection === 'episode' &&
                        audioLoading ? (
                          <p className="text-center text-xs text-white/80">
                            Preparing audio…
                          </p>
                        ) : null}
                        {coverEntitled && inSessionWithPage && audioError ? (
                          <p className="text-center text-xs text-rose-200">
                            {audioError}
                          </p>
                        ) : null}
                        {coverEntitled &&
                        inSessionWithPage &&
                        playbackSelection === 'episode' &&
                        usingPlaceholderAudio &&
                        !audioError ? (
                          <p className="text-center text-xs text-amber-100/95">
                            Episode production is still in progress. This track is
                            using temporary audio until the final MP3 is generated
                            and published.
                          </p>
                        ) : null}
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={coverScrubberProgress}
                          onChange={handleSeek}
                          disabled={coverScrubberDisabled}
                          className={`h-2 w-full appearance-none rounded-full bg-white/25 accent-rose-400 ${
                            coverScrubberDisabled
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer'
                          }`}
                        />
                        <div className="flex justify-between text-[11px] font-mono text-white/75">
                          <span>
                            {formatTime(
                              inSessionWithPage && duration
                                ? (coverScrubberProgress / 100) * duration
                                : 0
                            )}
                          </span>
                          <span>
                            {formatTime(
                              inSessionWithPage ? duration : 0
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={handleCoverPlayClick}
                            disabled={coverMainPlayDisabled}
                            className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-900/20 transition ${
                              coverMainPlayDisabled
                                ? 'cursor-not-allowed opacity-50'
                                : 'hover:scale-105 active:scale-95'
                            }`}
                          >
                            {coverIsPlaying ? (
                              <Pause className="h-7 w-7 fill-current" />
                            ) : (
                              <Play className="ml-1 h-7 w-7 fill-current" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white">
                              Play from the cover
                            </div>
                            {showSignupOnlyPreviewNotice ? (
                              <div
                                role="status"
                                className="mt-1 text-xs leading-5 text-amber-100/95"
                              >
                                Sign-up only free preview —{' '}
                                <Link
                                  href={`/signup?${new URLSearchParams({ callbackUrl: storyPath }).toString()}`}
                                  className="font-semibold underline underline-offset-2 hover:text-white"
                                >
                                  create a free account
                                </Link>{' '}
                                to listen (no paid subscription needed).
                              </div>
                            ) : (
                              <div className="text-xs leading-5 text-white/75">
                                <span className="lg:hidden">
                                  Pick an episode below, then hit play here.
                                </span>
                                <span className="hidden lg:inline">
                                  Pick an episode on the right, then hit play
                                  here.
                                </span>
                              </div>
                            )}
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
                        className="mt-1 text-sm font-semibold uppercase tracking-wide text-violet-700 hover:text-violet-800"
                        aria-expanded={isSummaryExpanded}
                      >
                        {isSummaryExpanded ? 'Show less' : 'Read more'}
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
            {showIntroChromeUi ? (
              <div className="flex items-center gap-3">
                <input
                  id={`skip-intro-${story.slug}`}
                  type="checkbox"
                  checked={
                    inSessionWithPage ? skipIntroPref : previewSkipIntro
                  }
                  onChange={(e) =>
                    inSessionWithPage
                      ? persistSkipIntro(e.target.checked)
                      : persistPreviewSkipIntro(e.target.checked)
                  }
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

        <section className="min-w-0 w-full max-w-full">
          {showTranscript && transcriptLines.length > 0 ? (
            <div className="aspect-[4/5] w-full max-w-full self-start overflow-hidden rounded-[1.6rem] bg-white shadow-lg ring-1 ring-slate-100">
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
            <div className="flex aspect-[4/5] min-h-0 w-full max-w-full flex-col self-start">
              <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                    <ListMusic className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Episodes</h2>
                    <StoryNarratorLine narrators={story.narrators} />
                  </div>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  {episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'}
                </div>
              </div>

              {showSignupOnlyPreviewNotice ? (
                <p
                  role="status"
                  className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-900"
                >
                  This free preview requires a free account to listen.{' '}
                  <Link
                    href={`/signup?${new URLSearchParams({ callbackUrl: storyPath }).toString()}`}
                    className="font-semibold underline underline-offset-2"
                  >
                    Sign up to play
                  </Link>
                  — no subscription needed.
                </p>
              ) : null}

              <ul
                className="min-h-0 min-w-0 flex-1 divide-y divide-slate-200 overflow-x-hidden overflow-y-auto pr-2"
                aria-live="polite"
              >
                {showSeriesThemeRow ? (
                  <li>
                    <div
                      className={`rounded-lg px-1 py-2 transition ${
                        seriesThemeRowReady &&
                        coverPlaybackSelection === 'fullTheme'
                          ? ''
                          : seriesThemeRowReady
                            ? 'hover:bg-slate-50/80'
                            : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={onSelectFullThemeFromTracklist}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectFullThemeFromTracklist();
                          }
                        }}
                        disabled={seriesThemeLoad === 'loading'}
                        aria-busy={seriesThemeLoad === 'loading'}
                        className="flex min-w-0 w-full max-w-full items-center gap-3 overflow-hidden rounded-md py-0 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-default"
                        aria-label={
                          seriesThemeLoad === 'loading'
                            ? 'Loading series theme music'
                            : coverLocked
                              ? 'Series theme music — sign in or subscribe to listen'
                              : 'Select and play series theme music'
                        }
                        aria-current={
                          seriesThemeRowReady &&
                          coverPlaybackSelection === 'fullTheme'
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
                          <span className={TRACKLIST_TITLE_CLASS}>
                            Series theme music
                          </span>
                          <span className={`${TRACKLIST_LABEL_CLASS} text-slate-400`}>
                            Full track
                          </span>
                        </span>
                        <span className="flex h-5 w-12 shrink-0 items-center justify-end">
                          {seriesThemeLoad === 'loading' ? (
                            <Loader2
                              className="h-4 w-4 animate-spin text-violet-500"
                              aria-hidden
                            />
                          ) : (
                            <span className="tabular-nums text-sm font-semibold text-slate-500">
                              {seriesThemeListDurationLabel}
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  </li>
                ) : null}
                {story.episodes.map((episode, index) => {
                  const episodeLocked = isEpisodeLockedAtIndex(index);
                  const active =
                    coverPlaybackSelection === 'episode' &&
                    index === episodeIndexForUi;
                  const desc = episode.description?.trim() ?? '';
                  const hasReadMore = desc.length > 0;
                  const durationLabel = episode.duration?.trim() || '—';
                  return (
                    <li key={episode.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectEpisodeFromTracklist(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectEpisodeFromTracklist(index);
                          }
                        }}
                        aria-current={active ? 'true' : undefined}
                        aria-label={
                          episodeLocked
                            ? episode.isFreePreview &&
                              episode.isFreePreviewRequiresSignup
                              ? `Episode ${episode.episodeNumber}: ${episode.title} — sign-up only free preview; create a free account to listen`
                              : `Episode ${episode.episodeNumber}: ${episode.title} — create your account to listen`
                            : `Select episode ${episode.episodeNumber}: ${episode.title}`
                        }
                        className={`flex min-w-0 w-full max-w-full cursor-pointer items-start gap-2 overflow-hidden rounded-lg px-1 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:items-center ${
                          active ? '' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <span className="flex w-7 shrink-0 justify-end pt-0.5 text-xs font-bold tabular-nums text-slate-400 sm:pt-0">
                          {episode.episodeNumber}
                        </span>
                        <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
                          <span className={TRACKLIST_TITLE_CLASS}>
                            {episode.title}
                          </span>
                          {!episode.isFreePreview && episodeLocked ? (
                            <span className={`${TRACKLIST_LABEL_CLASS} text-violet-600`}>
                              Premium
                            </span>
                          ) : null}
                        </span>
                        {hasReadMore ? (
                          <button
                            type="button"
                            className={`${TRACKLIST_LABEL_CLASS} text-slate-500 hover:text-slate-700 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400`}
                            aria-label={`Read full description: ${episode.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              episodeReadMoreReturnFocusRef.current =
                                e.currentTarget;
                              setEpisodeDescriptionModal({
                                title: episode.title,
                                description: desc,
                                episodeId: episode.id,
                                amazonBookUrl: episode.amazonBookUrl ?? null,
                              });
                            }}
                          >
                            Read more
                          </button>
                        ) : null}
                        <EpisodeAmazonBookLink episode={episode} />
                        <span className="shrink-0 pt-0.5 tabular-nums text-sm font-semibold text-slate-500 sm:pt-0">
                          {durationLabel}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
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
                      prefetch={false}
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
          episodeId={episodeDescriptionModal?.episodeId}
          amazonBookUrl={episodeDescriptionModal?.amazonBookUrl}
          onClose={() => setEpisodeDescriptionModal(null)}
          returnFocusRef={episodeReadMoreReturnFocusRef}
        />
      </div>
    </StoryEngagementProvider>
  );
}
