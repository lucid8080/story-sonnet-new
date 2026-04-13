'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Pause, Play } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { useStorySeriesPlayer } from '@/components/story/StorySeriesPlayerProvider';

function NavLink({
  href,
  children,
  activeClass,
  idleClass,
}: {
  href: string;
  children: React.ReactNode;
  activeClass: string;
  idleClass: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={isActive ? activeClass : idleClass}
    >
      {children}
    </Link>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === 'admin';
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

  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:gap-4 sm:px-7 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <Image
            src="/branding/logo.png"
            alt={BRAND.productName}
            width={96}
            height={32}
            className="h-8 w-auto max-w-[96px] object-contain object-left"
            priority
          />
          <div className="text-lg font-black tracking-tight text-slate-900">
            {BRAND.productName}
          </div>
        </Link>

        {showStoryMini && player?.story ? (
          <div className="story-nav-marquee hidden min-w-0 max-w-[min(14rem,28vw)] flex-1 flex-col sm:flex">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void player.togglePlay()}
                disabled={player.mainPlayButtonDisabled}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm shadow-rose-900/15 transition ${
                  player.mainPlayButtonDisabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:scale-105 active:scale-95'
                }`}
                aria-label={player.isPlaying ? 'Pause story' : 'Play story'}
              >
                {player.isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                )}
              </button>
              <Link
                href={`/story/${player.story.slug}`}
                className="min-w-0 max-w-full flex-1 overflow-hidden text-left font-miniMarquee text-[13px] font-normal uppercase tracking-wide text-slate-700 hover:text-slate-900"
                title={player.headerNowPlayingText}
              >
                <div className="story-nav-marquee max-w-full rounded-md py-0.5">
                  <div className="story-nav-marquee__track">
                    <span className="pr-10">
                      {player.headerNowPlayingText}
                    </span>
                    <span className="pr-10" aria-hidden>
                      {player.headerNowPlayingText}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ) : null}

        <nav className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 sm:gap-3">
          <NavLink
            href="/library"
            activeClass="hidden rounded-full bg-rose-500 px-3 py-1.5 text-white sm:inline-flex"
            idleClass="hidden rounded-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 sm:inline-flex"
          >
            Library
          </NavLink>
          <NavLink
            href="/pricing"
            activeClass="rounded-full bg-rose-500 px-3 py-1.5 text-white"
            idleClass="rounded-full px-3 py-1.5 text-rose-600 hover:bg-rose-50"
          >
            Pricing
          </NavLink>
          {isAdmin && (
            <NavLink
              href="/admin"
              activeClass="hidden rounded-full bg-rose-500 px-3 py-1.5 text-white sm:inline-flex"
              idleClass="hidden rounded-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 sm:inline-flex"
            >
              Admin
            </NavLink>
          )}

          <div className="h-6 w-px bg-slate-200" />

          {user ? (
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50 shadow-sm shadow-slate-400/40"
            >
              <span className="hidden sm:inline">Account</span>
              <span className="inline sm:hidden">You</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50 shadow-sm shadow-slate-400/40"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
