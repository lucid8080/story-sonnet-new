import { z } from 'zod';

export const CAMPAIGN_PLACEMENT_KEYS = [
  'global_top_bar',
  'homepage_hero',
  'pricing_banner',
  'checkout_callout',
  'account_dashboard_card',
  'library_banner',
  'story_detail_banner',
  'modal_trigger',
] as const;

export const campaignPlacementSchema = z.enum(CAMPAIGN_PLACEMENT_KEYS);

export const campaignTypeSchema = z.enum(['notification_bar', 'trial_offer', 'promo_code']);

export const campaignStatusSchema = z.enum([
  'draft',
  'scheduled',
  'active',
  'paused',
  'expired',
]);

export const campaignAudienceSchema = z.enum([
  'all',
  'logged_out',
  'logged_in',
  'subscribers',
  'free_users',
  'trial_users',
  'new_users',
]);

export const dismissPolicySchema = z.enum(['session', 'hours_24', 'days_7', 'until_campaign_end']);

/** Empty string or JSON null clears custom bar color (use theme default). */
export const barBackgroundHexSchema = z
  .union([z.literal(''), z.null(), z.string().regex(/^#[0-9A-Fa-f]{6}$/)])
  .optional()
  .transform((s) => {
    if (s === undefined) return undefined;
    if (s === null || s === '') return null;
    return s;
  });

export const discountTypeSchema = z.enum([
  'percent',
  'fixed_cents',
  'trial_extension_days',
  'free_first_payment',
]);

export const promoDurationSchema = z.enum(['once', 'recurring_cycles', 'forever']);

export const stackingRuleSchema = z.enum(['none', 'with_trial', 'with_announcement_only']);

export const trialOfferKindSchema = z.enum([
  'fixed_duration',
  'weekend_trial',
  'first_month_free',
  'premium_unlock',
]);

export const notificationDetailInputSchema = z.object({
  messagePrimary: z.string().min(1).max(2000),
  messageSecondary: z.string().max(2000).nullable().optional(),
  ctaLabel: z.string().max(120).nullable().optional(),
  ctaUrl: z.string().max(2000).nullable().optional(),
  dismissible: z.boolean().optional(),
  dismissPolicy: dismissPolicySchema.optional(),
  iconOrBadgeText: z.string().max(120).nullable().optional(),
  bgVariant: z.string().max(64).optional(),
  textVariant: z.string().max(64).optional(),
  audience: campaignAudienceSchema.optional(),
  barBackgroundHex: barBackgroundHexSchema,
});

export const trialDetailInputSchema = z.object({
  headline: z.string().min(1).max(500),
  subheadline: z.string().max(500).nullable().optional(),
  badgeText: z.string().max(120).nullable().optional(),
  ctaLabel: z.string().max(120).optional(),
  offerKind: trialOfferKindSchema.optional(),
  durationDays: z.number().int().min(0).max(3650).optional(),
  eligibilityJson: z.record(z.string(), z.unknown()).optional(),
  maxTotalRedemptions: z.number().int().min(1).nullable().optional(),
  maxPerUser: z.number().int().min(1).nullable().optional(),
  unlimitedRedemptions: z.boolean().optional(),
  autoApplySignup: z.boolean().optional(),
  linkedPromoCampaignId: z.string().cuid().nullable().optional(),
  landingSlug: z.string().max(200).nullable().optional(),
  barBackgroundHex: barBackgroundHexSchema,
});

export const promoDetailInputSchema = z.object({
  codeRaw: z.string().min(1).max(64),
  publicTitle: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  discountType: discountTypeSchema,
  discountValue: z.number().int().min(0),
  appliesToAllPlans: z.boolean().optional(),
  planKeysJson: z.array(z.string().max(64)).optional(),
  durationMode: promoDurationSchema.optional(),
  recurringCycles: z.number().int().min(1).max(120).nullable().optional(),
  stackingRule: stackingRuleSchema.optional(),
  firstPurchaseOnly: z.boolean().optional(),
  loggedInOnly: z.boolean().optional(),
  newUsersOnly: z.boolean().optional(),
  newUserMaxAgeDays: z.number().int().min(1).max(3650).nullable().optional(),
  onePerAccount: z.boolean().optional(),
  maxUsesTotal: z.number().int().min(1).nullable().optional(),
  maxUsesPerUser: z.number().int().min(1).nullable().optional(),
  unlimitedUses: z.boolean().optional(),
});

export const campaignCreateBodySchema = z
  .object({
    type: campaignTypeSchema,
    internalName: z.string().min(1).max(200),
    status: campaignStatusSchema.optional(),
    priority: z.number().int().min(0).max(1_000_000).optional(),
    pinnedHighest: z.boolean().optional(),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    timezone: z.string().max(64).optional(),
    placements: z.array(campaignPlacementSchema).min(1),
    notification: notificationDetailInputSchema.optional(),
    trial: trialDetailInputSchema.optional(),
    promo: promoDetailInputSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'notification_bar' && !data.notification) {
      ctx.addIssue({ code: 'custom', message: 'notification detail required', path: ['notification'] });
    }
    if (data.type === 'trial_offer' && !data.trial) {
      ctx.addIssue({ code: 'custom', message: 'trial detail required', path: ['trial'] });
    }
    if (data.type === 'promo_code' && !data.promo) {
      ctx.addIssue({ code: 'custom', message: 'promo detail required', path: ['promo'] });
    }
  });

export const campaignPatchBodySchema = z
  .object({
    internalName: z.string().min(1).max(200).optional(),
    status: campaignStatusSchema.optional(),
    priority: z.number().int().min(0).max(1_000_000).optional(),
    pinnedHighest: z.boolean().optional(),
    startsAt: z.string().min(1).optional(),
    endsAt: z.string().min(1).optional(),
    timezone: z.string().max(64).optional(),
    placements: z.array(campaignPlacementSchema).min(1).optional(),
    publishedAt: z.string().nullable().optional(),
    archivedAt: z.string().nullable().optional(),
    notification: notificationDetailInputSchema.optional(),
    trial: trialDetailInputSchema.partial().optional(),
    promo: promoDetailInputSchema.partial().optional(),
  })
  .strict();

export const campaignBulkBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('activate'),
    ids: z.array(z.string().cuid()).min(1).max(200),
  }),
  z.object({
    action: z.literal('pause'),
    ids: z.array(z.string().cuid()).min(1).max(200),
  }),
  z.object({
    action: z.literal('archive'),
    ids: z.array(z.string().cuid()).min(1).max(200),
  }),
  z.object({
    action: z.literal('duplicate'),
    ids: z.array(z.string().cuid()).min(1).max(50),
  }),
  z.object({
    action: z.literal('pause_all'),
    confirm: z.literal('yes'),
  }),
]);

export const campaignSettingsPatchSchema = z
  .object({
    defaultTimezone: z.string().max(64).optional(),
    defaultCampaignPriority: z.number().int().min(0).max(1_000_000).optional(),
    allowMultipleTopBars: z.boolean().optional(),
    globalKillSwitch: z.boolean().optional(),
    testModeEnabled: z.boolean().optional(),
    testModeUserIds: z.array(z.string().cuid()).max(500).optional(),
    previewHeaderName: z.string().max(64).optional(),
    previewHeaderSecret: z.string().max(200).nullable().optional(),
    defaultBarDismissPolicy: dismissPolicySchema.optional(),
    promosCanStackWithTrials: z.boolean().optional(),
  })
  .strict();

export const campaignListQuerySchema = z.object({
  type: campaignTypeSchema.optional(),
  status: campaignStatusSchema.optional(),
  placement: campaignPlacementSchema.optional(),
  q: z.string().max(200).optional(),
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

export const campaignEventsBodySchema = z.object({
  events: z
    .array(
      z.object({
        campaignId: z.string().cuid(),
        type: z.enum([
          'impression',
          'cta_click',
          'dismiss',
          'trial_claim',
          'promo_validate_ok',
          'promo_validate_fail',
          'promo_redeem',
          'conversion_proxy',
        ]),
        placement: campaignPlacementSchema.optional(),
        sessionKey: z.string().max(128).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1)
    .max(50),
});

export const promoValidateBodySchema = z.object({
  code: z.string().min(1).max(64),
  planKey: z.string().max(64).optional(),
});

export const trialClaimBodySchema = z.object({
  campaignId: z.string().cuid(),
});
