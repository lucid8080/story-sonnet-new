'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SpotlightRailDTO } from '@/lib/content-spotlight/types';
import { SpotlightCollectionRail } from '@/components/spotlight/SpotlightCollectionRail';

const AUTO_ADVANCE_MS = 6000;

export function getNextSlideIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

export function shouldUseSpotlightSlider(rails: SpotlightRailDTO[]): boolean {
  return rails.length > 1;
}

export function LibrarySpotlightEventSlider({
  rails,
}: {
  rails: SpotlightRailDTO[];
}) {
  const validRails = useMemo(() => rails.filter((rail) => rail.stories.length > 0), [rails]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isSlider = shouldUseSpotlightSlider(validRails);

  useEffect(() => {
    setActiveIndex(0);
  }, [validRails.length]);

  useEffect(() => {
    if (!isSlider || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => getNextSlideIndex(current, validRails.length));
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isSlider, isPaused, validRails.length]);

  if (validRails.length === 0) return null;
  if (!isSlider) {
    return <SpotlightCollectionRail rail={validRails[0]} />;
  }

  const currentRail = validRails[activeIndex] ?? validRails[0];

  return (
    <section
      className="mb-10"
      aria-label="Library spotlight events"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
    >
      <SpotlightCollectionRail rail={currentRail} compactSpacing />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2" aria-label="Spotlight slides">
          {validRails.map((rail, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={rail.spotlightId}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  isActive ? 'bg-slate-700' : 'bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Show spotlight ${index + 1}: ${rail.title}`}
                aria-pressed={isActive}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveIndex((current) =>
                (current - 1 + validRails.length) % validRails.length
              )
            }
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            aria-label="Previous spotlight"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndex((current) =>
                getNextSlideIndex(current, validRails.length)
              )
            }
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            aria-label="Next spotlight"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
