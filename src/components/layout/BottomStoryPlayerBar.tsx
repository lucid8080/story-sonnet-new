'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import { useStorySeriesPlayer } from '@/components/story/StorySeriesPlayerProvider';

export default function BottomStoryPlayerBar() {
  const pathname = usePathname();
  const player = useStorySeriesPlayer();

  const onPlayingStoryPage = Boolean(
    player?.story &&
      pathname &&
      pathname.replace(/\/$/, '') === `/story/${player.story.slug}`
  );

  const showStoryMini =
    Boolean(pathname && !pathname.startsWith('/admin')) &&
    !onPlayingStoryPage &&
    Boolean(
      player?.playbackSessionActive &&
        player.story &&
        player.headerNowPlayingText
    );

  if (!showStoryMini || !player?.story) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
      <div className="flex items-center gap-2 rounded-full bg-slate-900/95 px-2 py-2 shadow-xl shadow-slate-900/25 backdrop-blur">
        <button
          type="button"
          onClick={() => void player.togglePlay()}
          disabled={player.mainPlayButtonDisabled}
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm shadow-rose-900/15 transition ${
            player.mainPlayButtonDisabled
              ? 'cursor-not-allowed opacity-50'
              : 'hover:scale-105 active:scale-95'
          }`}
          aria-label={player.isPlaying ? 'Pause story' : 'Play story'}
          title={player.isPlaying ? 'Pause story' : 'Play story'}
        >
          {player.isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        <Link
          href={`/story/${player.story.slug}`}
          className="max-w-[8.5rem] rounded-full px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100 hover:bg-white/10"
          title={player.headerNowPlayingText}
        >
          <div className="story-nav-marquee max-w-full overflow-hidden">
            <div className="story-nav-marquee__track">
              <span className="pr-6">{player.headerNowPlayingText}</span>
              <span className="pr-6" aria-hidden>
                {player.headerNowPlayingText}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
