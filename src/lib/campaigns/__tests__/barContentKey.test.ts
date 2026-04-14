import { describe, expect, it } from 'vitest';
import type { CampaignWithRelations } from '@/lib/campaigns/types';
import {
  barContentKeyForNotificationBar,
  barContentKeyForTrialOffer,
} from '@/lib/campaigns/barContentKey';

function baseCampaign(overrides: Partial<CampaignWithRelations> = {}): CampaignWithRelations {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'cmp_1',
    type: 'notification_bar',
    status: 'active',
    internalName: 'Test',
    priority: 0,
    pinnedHighest: false,
    startsAt: now,
    endsAt: new Date('2026-12-31T00:00:00.000Z'),
    timezone: 'UTC',
    publishedAt: now,
    archivedAt: null,
    createdByUserId: null,
    createdAt: now,
    updatedAt: now,
    placements: [],
    notificationDetail: {
      campaignId: 'cmp_1',
      messagePrimary: 'Hello',
      messageSecondary: null,
      ctaLabel: null,
      ctaUrl: null,
      dismissible: true,
      dismissPolicy: 'session',
      iconOrBadgeText: null,
      bgVariant: 'brand',
      textVariant: 'light',
      barBackgroundHex: null,
      audience: 'all',
    },
    trialDetail: null,
    promoDetail: null,
    ...overrides,
  } as CampaignWithRelations;
}

describe('barContentKeyForNotificationBar', () => {
  it('returns the same key for identical visible fields', () => {
    const a = baseCampaign();
    const b = baseCampaign();
    expect(barContentKeyForNotificationBar(a)).toBe(barContentKeyForNotificationBar(b));
  });

  it('changes when message copy changes', () => {
    const a = baseCampaign();
    const b = baseCampaign({
      notificationDetail: {
        ...baseCampaign().notificationDetail!,
        messagePrimary: 'Goodbye',
      },
    });
    expect(barContentKeyForNotificationBar(a)).not.toBe(barContentKeyForNotificationBar(b));
  });
});

describe('barContentKeyForTrialOffer', () => {
  it('changes when headline changes', () => {
    const base = baseCampaign({
      type: 'trial_offer',
      notificationDetail: null,
      trialDetail: {
        campaignId: 'cmp_1',
        headline: 'One',
        subheadline: null,
        badgeText: null,
        ctaLabel: 'Go',
        offerKind: 'fixed_duration',
        durationDays: 7,
        eligibilityJson: {},
        maxTotalRedemptions: null,
        maxPerUser: null,
        unlimitedRedemptions: true,
        autoApplySignup: false,
        linkedPromoCampaignId: null,
        landingSlug: null,
        barBackgroundHex: null,
      },
    });
    const other = {
      ...base,
      trialDetail: { ...base.trialDetail!, headline: 'Two' },
    } as CampaignWithRelations;
    expect(barContentKeyForTrialOffer(base)).not.toBe(barContentKeyForTrialOffer(other));
  });
});
