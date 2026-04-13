import { describe, expect, it } from 'vitest';
import { trialOfferDefaultCtaHref } from '../trialCta';
import type { CampaignUserContext } from '../types';

const ctx = (over: Partial<CampaignUserContext>): CampaignUserContext => ({
  isLoggedIn: false,
  subscriptionStatus: 'free',
  subscriptionPlan: null,
  profileCreatedAt: null,
  hadPaidPurchase: false,
  lifetimeSpendCents: 0,
  ...over,
});

const SAMPLE_CAMPAIGN_ID = 'clqri8qbu0000l4085y3v9x1a';

describe('trialOfferDefaultCtaHref', () => {
  it('uses landing slug when set (ignores campaign id)', () => {
    expect(trialOfferDefaultCtaHref('  promo-landing  ', ctx({ isLoggedIn: false }), SAMPLE_CAMPAIGN_ID)).toBe(
      '/promo-landing'
    );
    expect(trialOfferDefaultCtaHref('/custom/path', ctx({ isLoggedIn: true }), SAMPLE_CAMPAIGN_ID)).toBe(
      '/custom/path'
    );
  });

  it('sends logged-out users to signup with pricing callback and trial ref', () => {
    const href = trialOfferDefaultCtaHref(null, ctx({ isLoggedIn: false }));
    expect(href.startsWith('/signup?')).toBe(true);
    const q = new URLSearchParams(href.slice('/signup?'.length));
    expect(q.get('callbackUrl')).toBe('/pricing');
    expect(q.get('ref')).toBe('trial_offer');
    expect(q.get('trialCampaignId')).toBe(null);
  });

  it('includes trialCampaignId on signup when campaign id provided', () => {
    const href = trialOfferDefaultCtaHref(null, ctx({ isLoggedIn: false }), SAMPLE_CAMPAIGN_ID);
    const q = new URLSearchParams(href.slice('/signup?'.length));
    expect(q.get('trialCampaignId')).toBe(SAMPLE_CAMPAIGN_ID);
  });

  it('sends logged-in users to pricing when slug empty', () => {
    expect(trialOfferDefaultCtaHref(null, ctx({ isLoggedIn: true, userId: 'u1' }))).toBe('/pricing');
    const withCamp = trialOfferDefaultCtaHref(null, ctx({ isLoggedIn: true, userId: 'u1' }), SAMPLE_CAMPAIGN_ID);
    expect(withCamp).toBe(`/pricing?trialCampaignId=${SAMPLE_CAMPAIGN_ID}`);
  });

  it('prefers landing slug over logged-out default', () => {
    expect(trialOfferDefaultCtaHref('signup', ctx({ isLoggedIn: false }))).toBe('/signup');
  });
});
