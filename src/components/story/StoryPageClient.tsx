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
  ChevronDown,
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
import type { PlaybackSelection } from '@/components/story/StorySeriesPlayerProvider';
import { getTranscriptLines } from '@/lib/transcripts';
import {
  StoryEngagementProvider,
  StorySeriesLibraryButton,
  StorySeriesCommentsPanel,
} from '@/components/story/StorySeriesEngagement';
import { EpisodeDescriptionModal } from '@/components/story/EpisodeDescriptionModal';
import { useStorySeriesPlayer } from '@/components/story/StorySeriesPlayerProvider';
import type {
  StorySpotlightBadgeDTO,
  StorySpotlightInfoBarDTO,
} from '@/lib/content-spotlight/types';
import { SpotlightBadgeOverlay } from '@/components/spotlight/SpotlightBadgeOverlay';
import { SpotlightInfoBar } from '@/components/spotlight/SpotlightInfoBar';

const EPISODE_WINDOW_SIZE = 3;

/** Episodes track list: Full track / Preview / Read more share typography; color is per-label. */
const TRACKLIST_LABEL_CLASS =
  'shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.18em]';

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
  story,
  isSignedIn,
  isSubscribed,
  recommendedStories,
  spotlightBadge,
  spotlightInfoBar,
}: {
  story: StoryForPlayer;
  isSignedIn: boolean;
  isSubscribed: boolean;
  recommendedStories: RecommendedStory[];
  spotlightBadge?: StorySpotlightBadgeDTO | null;
  spotlightInfoBar?: StorySpotlightInfoBarDTO | null;
}) {
  const router = useRouter();
  const player = useStorySeriesPlayer()!;
  const storyRef = useRef(story);
  storyRef.current = story;

  useLayoutEffect(() => {
    player.syncStoryFromPage(storyRef.current, isSubscribed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit `player`; syncStoryFromPage is stable
  }, [player.syncStoryFromPage, story.slug, isSubscribed]);

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
    showIntroChrome,
    showFullThemeBar,
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
  } | null>(null);
  const episodeReadMoreReturnFocusRef = useRef<HTMLElement | null>(null);
  const transcriptScrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [episodeWindowStart, setEpisodeWindowStart] = useState(0);

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
    setEpisodeDescriptionModal(null);
  }, [story.slug]);

  useEffect(() => {
    if (!useEpisodeWindow) return;
    setEpisodeWindowStart((prev) => {
      if (
        episodeIndexForUi >= prev &&
        episodeIndexForUi < prev + EPISODE_WINDOW_SIZE
      ) {
        return prev;
      }
      return Math.min(
        Math.max(0, episodeIndexForUi - EPISODE_WINDOW_SIZE + 1),
        maxEpisodeWindowStart
      );
    });
  }, [episodeIndexForUi, maxEpisodeWindowStart, useEpisodeWindow]);

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
    isSubscribed
  );
  const coverEntitled = inSessionWithPage ? entitled : pageEntitled;
  const coverLocked = !coverEntitled;
  const coverPlaybackSelection = inSessionWithPage
    ? playbackSelection
    : previewPlaybackSelection;

  const showIntroChromeUi = inSessionWithPage
    ? showIntroChrome
    : coverEntitled &&
      Boolean(story.hasIntroTheme) &&
      Boolean(story.themeIntroSrc);

  const showFullThemeBarUi = inSessionWithPage
    ? showFullThemeBar
    : coverEntitled &&
      Boolean(story.hasFullTheme) &&
      Boolean(story.themeFullSrc);

  const coverScrubberDisabled =
    !inSessionWithPage || scrubberDisabled;
  const coverMainPlayDisabled = inSessionWithPage
    ? mainPlayButtonDisabled
    : !coverEntitled;
  const coverIsPlaying = inSessionWithPage && isPlaying;
  /** Avoid showing another story's playback on this page's scrubber when session is deferred. */
  const coverScrubberProgress = inSessionWithPage ? progress : 0;

  const onSelectEpisodeFromTracklist = (index: number) => {
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
    });
  };

  const onSelectFullThemeFromTracklist = () => {
    if (inSessionWithPage) {
      selectFullTheme();
    } else {
      setPreviewPlaybackSelection('fullTheme');
    }
  };

  const handleCoverPlayClick = () => {
    if (coverLocked) {
      const path = `/story/${story.slug}`;
      if (isSignedIn) {
        router.push(`/pricing?callbackUrl=${encodeURIComponent(path)}`);
      } else {
        router.push(`/signup?callbackUrl=${encodeURIComponent(path)}`);
      }
      return;
    }
    if (!inSessionWithPage) {
      playAfterClaimRef.current = true;
      claimStorySession(story, isSubscribed, {
        initialEpisodeIndex: previewEpisodeIndex,
        initialPlaybackSelection: previewPlaybackSelection,
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50 text-slate-800">
        <main className="mx-auto grid max-w-6xl gap-8 px-5 py-5 sm:px-7 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-6">
        {spotlightInfoBar ? (
          <div className="lg:col-span-2">
            <SpotlightInfoBar spotlight={spotlightInfoBar} />
          </div>
        ) : null}
        <section>
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
                            Placeholder audio — upload the MP3 or fix the CDN path
                            when ready.
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

              <ul className="divide-y divide-slate-200" aria-live="polite">
                {showFullThemeBarUi ? (
                  <li>
                    <div
                      className={`rounded-lg px-1 py-2 transition ${
                        coverPlaybackSelection === 'fullTheme'
                          ? ''
                          : 'hover:bg-slate-50/80'
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
                        className="flex w-full items-center gap-3 rounded-md py-0 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                        aria-label="Select series theme music (play from cover)"
                        aria-current={
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
                          <span className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">
                            Series theme music
                          </span>
                          <span className={`${TRACKLIST_LABEL_CLASS} text-slate-400`}>
                            Full track
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-500">
                          {seriesThemeListDurationLabel}
                        </span>
                      </button>
                    </div>
                  </li>
                ) : null}
                {visibleEpisodeIndices.map((index) => {
                  const episode = story.episodes[index];
                  const active =
                    coverPlaybackSelection === 'episode' &&
                    index === episodeIndexForUi;
                  const desc = episode.description?.trim() ?? '';
                  const hasReadMore = desc.length > 0;
                  const durationLabel = episode.duration?.trim() || '—';
                  return (
                    <li key={episode.id}>
                      <div
                        className={`flex w-full items-center gap-2 rounded-lg px-1 py-2 transition ${
                          active
                            ? ''
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectEpisodeFromTracklist(index)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectEpisodeFromTracklist(index);
                            }
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-0 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                          aria-current={active ? 'true' : undefined}
                          aria-label={`Select episode ${episode.episodeNumber}: ${episode.title}`}
                        >
                          <span className="w-7 shrink-0 text-right text-xs font-bold tabular-nums text-slate-400">
                            {episode.episodeNumber}
                          </span>
                          <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
                            <span className="min-w-0 truncate text-base font-bold text-slate-900">
                              {episode.title}
                            </span>
                            {episode.isFreePreview ? (
                              <span className={`${TRACKLIST_LABEL_CLASS} text-rose-600`}>
                                Preview
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {hasReadMore ? (
                          <button
                            type="button"
                            className={`${TRACKLIST_LABEL_CLASS} text-slate-500 hover:text-slate-700 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400`}
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
                          onClick={() => onSelectEpisodeFromTracklist(index)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectEpisodeFromTracklist(index);
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
