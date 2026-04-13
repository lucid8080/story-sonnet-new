import type { ContentSpotlightStatus } from '@prisma/client';
import type { SpotlightWindowFields } from '@/lib/content-spotlight/window';
import { instantInEffectiveWindow } from '@/lib/content-spotlight/window';

export type PublishedSpotlightFields = SpotlightWindowFields & {
  status: ContentSpotlightStatus;
  publishedAt: Date | null;
};

export function isRenderableStatus(status: ContentSpotlightStatus): boolean {
  return status === 'active' || status === 'scheduled';
}

export function isSpotlightPubliclyVisible(
  spotlight: PublishedSpotlightFields,
  at: Date
): boolean {
  if (spotlight.publishedAt == null) return false;
  if (
    spotlight.status === 'draft' ||
    spotlight.status === 'paused' ||
    spotlight.status === 'expired'
  ) {
    return false;
  }
  if (!isRenderableStatus(spotlight.status)) return false;
  return instantInEffectiveWindow(spotlight, at);
}
