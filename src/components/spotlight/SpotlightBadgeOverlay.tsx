'use client';

import Image from 'next/image';
import type { ContentSpotlightBadgeCorner } from '@/lib/validation/contentSpotlightSchema';
import { useState } from 'react';
import type { StorySpotlightBadgeDTO } from '@/lib/content-spotlight/types';
import { SpotlightBadgeDialog } from '@/components/spotlight/SpotlightBadgeDialog';

const CORNER_INSET: Record<ContentSpotlightBadgeCorner, string> = {
  bottom_right: 'bottom-3 right-3',
  bottom_left: 'bottom-3 left-3',
  top_right: 'top-3 right-3',
  top_left: 'top-3 left-3',
};

export function SpotlightBadgeOverlay({
  spotlight,
}: {
  spotlight: StorySpotlightBadgeDTO | null;
}) {
  const [open, setOpen] = useState(false);
  if (!spotlight?.badgeUrl) return null;

  const corner = CORNER_INSET[spotlight.badgeCorner];

  const inner = (
    <span className="relative h-14 w-14 overflow-hidden rounded-full">
      <Image
        src={spotlight.badgeUrl}
        alt={spotlight.badgeAlt || spotlight.title}
        fill
        className="object-contain"
        sizes="56px"
      />
    </span>
  );

  return (
    <>
      {spotlight.showPopup ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={`absolute z-10 flex h-16 w-16 items-center justify-center rounded-full transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${corner}`}
          aria-label={`About ${spotlight.title}`}
        >
          {inner}
        </button>
      ) : (
        <span
          className={`pointer-events-none absolute z-10 flex h-16 w-16 items-center justify-center rounded-full ${corner}`}
          aria-hidden
        >
          {inner}
        </span>
      )}
      <SpotlightBadgeDialog
        open={open}
        onClose={() => setOpen(false)}
        spotlight={spotlight}
      />
    </>
  );
}
