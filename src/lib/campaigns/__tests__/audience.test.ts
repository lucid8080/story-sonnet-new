import { describe, expect, it } from 'vitest';
import { trialOfferVisibleForSignupWindow } from '../audience';
import type { CampaignUserContext } from '../types';

const baseCtx = (over: Partial<CampaignUserContext>): CampaignUserContext => ({
  isLoggedIn: false,
  subscriptionStatus: 'free',
  subscriptionPlan: null,
  profileCreatedAt: null,
  hadPaidPurchase: false,
  lifetimeSpendCents: 0,
  ...over,
});

describe('trialOfferVisibleForSignupWindow', () => {
  const created = new Date('2026-01-01T12:00:00.000Z');

  it('returns true when newUserMaxAgeDays is unset', () => {
    expect(
      trialOfferVisibleForSignupWindow({}, baseCtx({ isLoggedIn: true, profileCreatedAt: created }), created)
    ).toBe(true);
  });

  it('returns true when newUserMaxAgeDays is not positive', () => {
    expect(
      trialOfferVisibleForSignupWindow(
        { newUserMaxAgeDays: 0 },
        baseCtx({ isLoggedIn: true, profileCreatedAt: created }),
        new Date('2026-01-20T12:00:00.000Z')
      )
    ).toBe(true);
  });

  it('returns true for logged-out viewers even when rule is set', () => {
    expect(
      trialOfferVisibleForSignupWindow(
        { newUserMaxAgeDays: 14 },
        baseCtx({ isLoggedIn: false }),
        new Date('2026-06-01T12:00:00.000Z')
      )
    ).toBe(true);
  });

  it('returns true inside the signup window', () => {
    const now = new Date('2026-01-10T12:00:00.000Z');
    expect(
      trialOfferVisibleForSignupWindow(
        { newUserMaxAgeDays: 14 },
        baseCtx({ isLoggedIn: true, profileCreatedAt: created }),
        now
      )
    ).toBe(true);
  });

  it('returns false after the signup window (same boundary as claim eligibility)', () => {
    const now = new Date('2026-01-16T12:00:00.001Z');
    expect(
      trialOfferVisibleForSignupWindow(
        { newUserMaxAgeDays: 14 },
        baseCtx({ isLoggedIn: true, profileCreatedAt: created }),
        now
      )
    ).toBe(false);
  });

  it('returns true at the inclusive end of day 14', () => {
    const now = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
    expect(
      trialOfferVisibleForSignupWindow(
        { newUserMaxAgeDays: 14 },
        baseCtx({ isLoggedIn: true, profileCreatedAt: created }),
        now
      )
    ).toBe(true);
  });
});
