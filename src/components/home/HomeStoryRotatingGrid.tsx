'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HomeRotatingStoryCard } from '@/lib/homeRotatingStory';

const MAX_SLOTS = 20;
/** Crossfade duration (incoming fades in as outgoing fades out). */
const CROSSFADE_MS = 2200;
const ROTATE_MIN_MS = 4500;
const ROTATE_MAX_MS = 6000;

type Crossfade = {
  slotIndex: number;
  outgoing: HomeRotatingStoryCard;
  incoming: HomeRotatingStoryCard;
  /** After rAF, both layers transition; before that incoming stays at opacity 0. */
  armed: boolean;
};

function randomCandidate(
  pool: HomeRotatingStoryCard[],
  slots: HomeRotatingStoryCard[],
  slotIndex: number
): HomeRotatingStoryCard | null {
  const visible = new Set(slots.map((s) => s.slug));
  const currentSlug = slots[slotIndex].slug;
  let candidates = pool.filter((p) => !visible.has(p.slug));
  if (candidates.length === 0) {
    candidates = pool.filter((p) => p.slug !== currentSlug);
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

function nextRotateDelayMs(): number {
  return (
    ROTATE_MIN_MS +
    Math.floor(Math.random() * (ROTATE_MAX_MS - ROTATE_MIN_MS + 1))
  );
}

type Props = {
  pool: HomeRotatingStoryCard[];
};

const IMG_SIZES =
  '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw';

export function HomeStoryRotatingGrid({ pool }: Props) {
  const [slots, setSlots] = useState<HomeRotatingStoryCard[]>(() =>
    pool.slice(0, Math.min(MAX_SLOTS, pool.length))
  );
  const [crossfade, setCrossfade] = useState<Crossfade | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const poolRef = useRef(pool);
  poolRef.current = pool;

  const crossfadeRef = useRef<Crossfade | null>(null);
  crossfadeRef.current = crossfade;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = useCallback(() => {
    const p = poolRef.current;
    const prev = slotsRef.current;
    if (prev.length === 0 || p.length <= 1) return;
    if (crossfadeRef.current) return;

    const slotIndex = Math.floor(Math.random() * prev.length);
    const nextStory = randomCandidate(p, prev, slotIndex);
    if (!nextStory) return;

    setCrossfade({
      slotIndex,
      outgoing: prev[slotIndex],
      incoming: nextStory,
      armed: false,
    });
  }, []);

  useLayoutEffect(() => {
    if (!crossfade || crossfade.armed) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        setCrossfade((c) =>
          c && !c.armed ? { ...c, armed: true } : c
        );
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [crossfade]);

  useEffect(() => {
    if (!crossfade?.armed) return;
    const { slotIndex, incoming } = crossfade;
    if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
    commitTimeoutRef.current = setTimeout(() => {
      setSlots((cur) => {
        if (slotIndex >= cur.length) return cur;
        const copy = [...cur];
        copy[slotIndex] = incoming;
        return copy;
      });
      setCrossfade(null);
    }, CROSSFADE_MS);
    return () => {
      if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
    };
  }, [crossfade]);

  useEffect(() => {
    if (pool.length <= 1) return;

    const schedule = () => {
      timeoutRef.current = setTimeout(() => {
        tick();
        schedule();
      }, nextRotateDelayMs());
    };

    schedule();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
    };
  }, [pool.length, tick]);

  if (slots.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500">
        No stories in the library yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {slots.map((story, i) => {
        const cf = crossfade?.slotIndex === i ? crossfade : null;
        const activeStory = cf ? cf.incoming : story;
        const isCrossfading = !!cf;
        const armed = cf?.armed ?? false;

        return (
          <Link
            key={`slot-${i}-${cf ? cf.incoming.slug : story.slug}`}
            href={`/story/${activeStory.slug}`}
            className={`group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/70 ring-1 ring-slate-100 transition duration-300 hover:shadow-2xl ${
              isCrossfading ? 'pointer-events-none' : ''
            }`}
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              {cf ? (
                <>
                  {/* Incoming underneath (fades in); outgoing on top (fades out) — no empty gap */}
                  <div
                    className={`absolute inset-0 z-[1] transition-opacity ease-in-out ${
                      armed ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      transitionDuration: `${CROSSFADE_MS}ms`,
                      backgroundColor: cf.incoming.accent || '#cbd5e1',
                    }}
                  >
                    {cf.incoming.cover ? (
                      <Image
                        key={`incoming-${cf.incoming.slug}`}
                        src={cf.incoming.cover}
                        alt={`${cf.incoming.title} cover art`}
                        fill
                        sizes={IMG_SIZES}
                        className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div
                    className={`absolute inset-0 z-[2] transition-opacity ease-in-out ${
                      armed ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{
                      transitionDuration: `${CROSSFADE_MS}ms`,
                      backgroundColor: cf.outgoing.accent || '#cbd5e1',
                    }}
                  >
                    {cf.outgoing.cover ? (
                      <Image
                        key={`outgoing-${cf.outgoing.slug}`}
                        src={cf.outgoing.cover}
                        alt={`${cf.outgoing.title} cover art`}
                        fill
                        sizes={IMG_SIZES}
                        className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <div
                  className="relative h-full w-full"
                  style={{ backgroundColor: story.accent || '#cbd5e1' }}
                >
                  {story.cover ? (
                    <Image
                      key={story.slug}
                      src={story.cover}
                      alt={`${story.title} cover art`}
                      fill
                      sizes={IMG_SIZES}
                      className="object-cover object-top transition duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
              )}
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-[3] -translate-x-1/2 translate-y-1 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700 opacity-0 shadow-sm ring-1 ring-slate-100 backdrop-blur transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  {activeStory.episodeCount}{' '}
                  {activeStory.episodeCount === 1 ? 'episode' : 'episodes'}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
