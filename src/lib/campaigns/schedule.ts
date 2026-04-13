import type { CampaignStatus } from '@prisma/client';

/** Live window: inclusive start, inclusive end (same instant allowed). */
export function isWithinSchedule(startsAt: Date, endsAt: Date, now: Date): boolean {
  return now >= startsAt && now <= endsAt;
}

export function statusAllowsRender(status: CampaignStatus): boolean {
  return status === 'active' || status === 'scheduled';
}
