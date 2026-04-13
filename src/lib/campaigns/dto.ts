import type { CampaignWithRelations, ResolvedCampaignPayload } from './types';

export function toPublicPayload(c: CampaignWithRelations): ResolvedCampaignPayload | null {
  if (c.type === 'notification_bar' && c.notificationDetail) {
    const d = c.notificationDetail;
    return {
      kind: 'notification_bar',
      campaignId: c.id,
      campaignEndsAt: c.endsAt.toISOString(),
      messagePrimary: d.messagePrimary,
      messageSecondary: d.messageSecondary,
      ctaLabel: d.ctaLabel,
      ctaUrl: d.ctaUrl,
      dismissible: d.dismissible,
      dismissPolicy: d.dismissPolicy,
      iconOrBadgeText: d.iconOrBadgeText,
      bgVariant: d.bgVariant,
      textVariant: d.textVariant,
      barBackgroundHex: d.barBackgroundHex,
    };
  }
  if (c.type === 'trial_offer' && c.trialDetail) {
    const d = c.trialDetail;
    return {
      kind: 'trial_offer',
      campaignId: c.id,
      campaignEndsAt: c.endsAt.toISOString(),
      dismissible: true,
      dismissPolicy: 'hours_24',
      headline: d.headline,
      subheadline: d.subheadline,
      badgeText: d.badgeText,
      ctaLabel: d.ctaLabel,
      landingSlug: d.landingSlug,
      barBackgroundHex: d.barBackgroundHex,
    };
  }
  if (c.type === 'promo_code' && c.promoDetail) {
    const d = c.promoDetail;
    return {
      kind: 'promo_code',
      campaignId: c.id,
      codeRaw: d.codeRaw,
      publicTitle: d.publicTitle,
      description: d.description,
      discountType: d.discountType,
      discountValue: d.discountValue,
    };
  }
  return null;
}
