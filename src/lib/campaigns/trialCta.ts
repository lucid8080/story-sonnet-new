import type { CampaignUserContext } from './types';

/**
 * Default destination for a trial bar CTA when `landingSlug` is not set.
 * Logged-out users go to sign up first (avoids pricing-page promo-code emphasis);
 * logged-in users go straight to pricing to subscribe.
 * When `campaignId` is set, it is passed as `trialCampaignId` so signup can claim and checkout can apply trial days.
 */
export function trialOfferDefaultCtaHref(
  landingSlug: string | null,
  user: CampaignUserContext,
  campaignId?: string | null
): string {
  if (landingSlug?.trim()) {
    const s = landingSlug.trim().replace(/^\/+/, '');
    return `/${s}`;
  }
  const cid = campaignId?.trim() || '';
  if (user.isLoggedIn) {
    if (cid) {
      return `/pricing?${new URLSearchParams({ trialCampaignId: cid }).toString()}`;
    }
    return '/pricing';
  }
  const params = new URLSearchParams();
  params.set('callbackUrl', '/pricing');
  params.set('ref', 'trial_offer');
  if (cid) params.set('trialCampaignId', cid);
  return `/signup?${params.toString()}`;
}
