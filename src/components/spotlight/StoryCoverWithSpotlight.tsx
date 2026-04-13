'use client';

import type { StorySpotlightBadgeDTO } from '@/lib/content-spotlight/types';
import { SpotlightBadgeOverlay } from '@/components/spotlight/SpotlightBadgeOverlay';

export function StoryCoverWithSpotlight({
  children,
  spotlight,
}: {
  children: React.ReactNode;
  spotlight: StorySpotlightBadgeDTO | null;
}) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl">
      {children}
      <SpotlightBadgeOverlay spotlight={spotlight} />
    </div>
  );
}
