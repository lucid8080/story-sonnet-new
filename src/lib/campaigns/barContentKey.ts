import { createHash } from 'crypto';
import type { CampaignWithRelations } from './types';

function hashPayload(parts: Record<string, unknown>): string {
  const json = JSON.stringify(parts, Object.keys(parts).sort());
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

/** Stable key for top-bar dismiss + "new copy" detection (nested detail edits may not bump Campaign.updatedAt). */
export function barContentKeyForNotificationBar(c: CampaignWithRelations): string {
  const d = c.notificationDetail;
  if (!d) return c.id;
  return hashPayload({
    kind: 'notification_bar',
    campaignId: c.id,
    campaignEndsAt: c.endsAt.toISOString(),
    messagePrimary: d.messagePrimary,
    messageSecondary: d.messageSecondary ?? '',
    ctaLabel: d.ctaLabel ?? '',
    ctaUrl: d.ctaUrl ?? '',
    dismissible: d.dismissible,
    dismissPolicy: d.dismissPolicy,
    iconOrBadgeText: d.iconOrBadgeText ?? '',
    bgVariant: d.bgVariant,
    textVariant: d.textVariant,
    barBackgroundHex: d.barBackgroundHex ?? '',
  });
}

export function barContentKeyForTrialOffer(c: CampaignWithRelations): string {
  const d = c.trialDetail;
  if (!d) return c.id;
  return hashPayload({
    kind: 'trial_offer',
    campaignId: c.id,
    campaignEndsAt: c.endsAt.toISOString(),
    headline: d.headline,
    subheadline: d.subheadline ?? '',
    ctaLabel: d.ctaLabel,
    landingSlug: d.landingSlug ?? '',
    badgeText: d.badgeText ?? '',
    durationDays: d.durationDays,
    barBackgroundHex: d.barBackgroundHex ?? '',
  });
}
