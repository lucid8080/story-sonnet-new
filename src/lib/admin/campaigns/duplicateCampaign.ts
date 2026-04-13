import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

function slugSuffix() {
  return randomBytes(4).toString('hex');
}

export async function duplicateCampaign(prisma: PrismaClient, sourceId: string, createdByUserId: string | null) {
  const src = await prisma.campaign.findUnique({
    where: { id: sourceId },
    include: {
      placements: true,
      notificationDetail: true,
      trialDetail: true,
      promoDetail: true,
    },
  });
  if (!src) return null;

  const internalName = `${src.internalName} (copy ${slugSuffix()})`;

  if (src.type === 'promo_code' && src.promoDetail) {
    const base = src.promoDetail.codeNormalized;
    const codeNormalized = `${base}-copy-${slugSuffix()}`;
    const codeRaw = `${src.promoDetail.codeRaw}-COPY`;
    return prisma.campaign.create({
      data: {
        type: src.type,
        status: 'draft',
        internalName,
        priority: src.priority,
        pinnedHighest: false,
        startsAt: src.startsAt,
        endsAt: src.endsAt,
        timezone: src.timezone,
        createdByUserId,
        placements: { create: src.placements.map((p) => ({ placement: p.placement })) },
        promoDetail: {
          create: {
            codeRaw,
            codeNormalized,
            publicTitle: src.promoDetail.publicTitle,
            description: src.promoDetail.description,
            discountType: src.promoDetail.discountType,
            discountValue: src.promoDetail.discountValue,
            appliesToAllPlans: src.promoDetail.appliesToAllPlans,
            planKeysJson: src.promoDetail.planKeysJson ?? [],
            durationMode: src.promoDetail.durationMode,
            recurringCycles: src.promoDetail.recurringCycles,
            stackingRule: src.promoDetail.stackingRule,
            firstPurchaseOnly: src.promoDetail.firstPurchaseOnly,
            loggedInOnly: src.promoDetail.loggedInOnly,
            newUsersOnly: src.promoDetail.newUsersOnly,
            newUserMaxAgeDays: src.promoDetail.newUserMaxAgeDays,
            onePerAccount: src.promoDetail.onePerAccount,
            maxUsesTotal: src.promoDetail.maxUsesTotal,
            maxUsesPerUser: src.promoDetail.maxUsesPerUser,
            unlimitedUses: src.promoDetail.unlimitedUses,
          },
        },
      },
    });
  }

  if (src.type === 'notification_bar' && src.notificationDetail) {
    const d = src.notificationDetail;
    return prisma.campaign.create({
      data: {
        type: src.type,
        status: 'draft',
        internalName,
        priority: src.priority,
        pinnedHighest: false,
        startsAt: src.startsAt,
        endsAt: src.endsAt,
        timezone: src.timezone,
        createdByUserId,
        placements: { create: src.placements.map((p) => ({ placement: p.placement })) },
        notificationDetail: {
          create: {
            messagePrimary: d.messagePrimary,
            messageSecondary: d.messageSecondary,
            ctaLabel: d.ctaLabel,
            ctaUrl: d.ctaUrl,
            dismissible: d.dismissible,
            dismissPolicy: d.dismissPolicy,
            iconOrBadgeText: d.iconOrBadgeText,
            bgVariant: d.bgVariant,
            textVariant: d.textVariant,
            audience: d.audience,
            barBackgroundHex: d.barBackgroundHex,
          },
        },
      },
    });
  }

  if (src.type === 'trial_offer' && src.trialDetail) {
    const d = src.trialDetail;
    return prisma.campaign.create({
      data: {
        type: src.type,
        status: 'draft',
        internalName,
        priority: src.priority,
        pinnedHighest: false,
        startsAt: src.startsAt,
        endsAt: src.endsAt,
        timezone: src.timezone,
        createdByUserId,
        placements: { create: src.placements.map((p) => ({ placement: p.placement })) },
        trialDetail: {
          create: {
            headline: d.headline,
            subheadline: d.subheadline,
            badgeText: d.badgeText,
            ctaLabel: d.ctaLabel,
            offerKind: d.offerKind,
            durationDays: d.durationDays,
            eligibilityJson: d.eligibilityJson ?? {},
            maxTotalRedemptions: d.maxTotalRedemptions,
            maxPerUser: d.maxPerUser,
            unlimitedRedemptions: d.unlimitedRedemptions,
            autoApplySignup: d.autoApplySignup,
            linkedPromoCampaignId: d.linkedPromoCampaignId,
            landingSlug: d.landingSlug,
            barBackgroundHex: d.barBackgroundHex,
          },
        },
      },
    });
  }

  return null;
}
