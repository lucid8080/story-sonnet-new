import type {
  Campaign,
  CampaignPlacement,
  CampaignPlacementKey,
  CampaignSettings,
  NotificationBarDetail,
  PromoCodeDetail,
  TrialOfferDetail,
} from '@prisma/client';

export type CampaignUserContext = {
  isLoggedIn: boolean;
  userId?: string;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  profileCreatedAt: Date | null;
  hadPaidPurchase: boolean;
  lifetimeSpendCents: number;
};

export type CampaignWithRelations = Campaign & {
  placements: CampaignPlacement[];
  notificationDetail: NotificationBarDetail | null;
  trialDetail: TrialOfferDetail | null;
  promoDetail: PromoCodeDetail | null;
};

export type ResolveOptions = {
  now: Date;
  placement: CampaignPlacementKey;
  pathname: string;
  user: CampaignUserContext;
  settings: CampaignSettings | null;
  /** When secret header matches settings, include draft campaigns for preview user ids */
  previewMode: boolean;
};

export type PublicNotificationBarPayload = {
  kind: 'notification_bar';
  campaignId: string;
  /** Hash of visible bar fields; dismiss storage keys on this so copy edits resurface the bar. */
  barContentKey: string;
  campaignEndsAt?: string;
  messagePrimary: string;
  messageSecondary: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  dismissible: boolean;
  dismissPolicy: string;
  iconOrBadgeText: string | null;
  bgVariant: string;
  textVariant: string;
  /** When set, overrides bgVariant for the public bar background (#RRGGBB). */
  barBackgroundHex?: string | null;
};

export type PublicTrialPayload = {
  kind: 'trial_offer';
  campaignId: string;
  /** Hash of visible bar fields; dismiss storage keys on this so copy edits resurface the bar. */
  barContentKey: string;
  /** For global bar: schedule end + dismiss-until-campaign-end */
  campaignEndsAt?: string;
  /** Top bar: same semantics as notification bar (defaults from resolver/DTO) */
  dismissible?: boolean;
  dismissPolicy?: string;
  headline: string;
  subheadline: string | null;
  badgeText: string | null;
  ctaLabel: string;
  landingSlug: string | null;
  /** Resolved default or custom path; set by resolveCampaignPayloads. */
  ctaHref?: string;
  /** When set, overrides default emerald bar (#RRGGBB). */
  barBackgroundHex?: string | null;
};

export type PublicPromoPayload = {
  kind: 'promo_code';
  campaignId: string;
  codeRaw: string;
  publicTitle: string;
  description: string;
  discountType: string;
  discountValue: number;
};

export type ResolvedCampaignPayload =
  | PublicNotificationBarPayload
  | PublicTrialPayload
  | PublicPromoPayload;
