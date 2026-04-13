import type { PrismaClient } from '@prisma/client';
import { isWithinSchedule, statusAllowsRender } from './schedule';
import { getOrCreateCampaignSettings, parseTestUserIds } from './settings';
import type { CampaignUserContext } from './types';

export type PromoValidateResult =
  | {
      ok: true;
      campaignId: string;
      codeRaw: string;
      publicTitle: string;
      description: string;
      discountType: string;
      discountValue: number;
      durationMode: string;
      recurringCycles: number | null;
      stackingRule: string;
      appliesToAllPlans: boolean;
      planKeys: string[];
    }
  | { ok: false; code: string; message: string };

export function normalizePromoCodeInput(code: string): string {
  return code.trim().toLowerCase();
}

export async function validatePromoCode(
  prisma: PrismaClient,
  params: {
    code: string;
    user: CampaignUserContext;
    now?: Date;
    planKey?: string | null;
    previewMode?: boolean;
  }
): Promise<PromoValidateResult> {
  const now = params.now ?? new Date();
  const normalized = normalizePromoCodeInput(params.code);
  if (!normalized) {
    return { ok: false, code: 'empty', message: 'Enter a promo code.' };
  }

  const settings = await getOrCreateCampaignSettings(prisma);
  if (settings.globalKillSwitch) {
    return { ok: false, code: 'inactive', message: 'Promotions are temporarily unavailable.' };
  }
  if (settings.testModeEnabled && !params.previewMode) {
    const ids = parseTestUserIds(settings.testModeUserIdsJson);
    if (ids.length === 0 || !params.user.userId || !ids.includes(params.user.userId)) {
      return { ok: false, code: 'test_mode', message: 'Promotions are in test mode.' };
    }
  }

  const detail = await prisma.promoCodeDetail.findUnique({
    where: { codeNormalized: normalized },
    include: { campaign: true },
  });

  if (!detail || detail.campaign.archivedAt) {
    return { ok: false, code: 'not_found', message: 'That code is not valid.' };
  }

  const c = detail.campaign;
  const statusOk =
    params.previewMode && c.status === 'draft'
      ? true
      : statusAllowsRender(c.status) && c.status !== 'draft';
  if (!statusOk) {
    return { ok: false, code: 'inactive', message: 'This code is not active right now.' };
  }
  if (!params.previewMode || c.status !== 'draft') {
    if (!isWithinSchedule(c.startsAt, c.endsAt, now)) {
      return { ok: false, code: 'expired', message: 'This code is not valid for the current dates.' };
    }
  }

  if (detail.loggedInOnly && !params.user.isLoggedIn) {
    return { ok: false, code: 'login_required', message: 'Sign in to use this code.' };
  }

  if (detail.newUsersOnly) {
    if (!params.user.isLoggedIn || !params.user.profileCreatedAt) {
      return { ok: false, code: 'new_users_only', message: 'This code is for new users only.' };
    }
    const maxDays = detail.newUserMaxAgeDays ?? 14;
    if (Date.now() - params.user.profileCreatedAt.getTime() > maxDays * 24 * 60 * 60 * 1000) {
      return { ok: false, code: 'new_users_only', message: 'This code is for new users only.' };
    }
  }

  if (detail.firstPurchaseOnly && params.user.hadPaidPurchase) {
    return { ok: false, code: 'first_purchase', message: 'This code is for first purchases only.' };
  }

  if (!detail.appliesToAllPlans) {
    const keys = Array.isArray(detail.planKeysJson)
      ? detail.planKeysJson.filter((x): x is string => typeof x === 'string')
      : [];
    const want = (params.planKey || params.user.subscriptionPlan || '').trim().toLowerCase();
    if (keys.length && !keys.map((k) => k.toLowerCase()).includes(want)) {
      return { ok: false, code: 'plan', message: 'This code does not apply to your selection.' };
    }
  }

  if (!detail.unlimitedUses && detail.maxUsesTotal != null) {
    const total = await prisma.promoCodeRedemption.count({
      where: { campaignId: c.id },
    });
    if (total >= detail.maxUsesTotal) {
      return { ok: false, code: 'sold_out', message: 'This code has reached its usage limit.' };
    }
  }

  const uid = params.user.userId;
  if (uid && detail.maxUsesPerUser != null) {
    const mine = await prisma.promoCodeRedemption.count({
      where: { campaignId: c.id, userId: uid },
    });
    if (mine >= detail.maxUsesPerUser) {
      return { ok: false, code: 'per_user_limit', message: 'You have already used this code the maximum number of times.' };
    }
  }

  if (detail.onePerAccount && uid) {
    const existing = await prisma.promoCodeRedemption.findFirst({
      where: { campaignId: c.id, userId: uid },
    });
    if (existing) {
      return { ok: false, code: 'already_used', message: 'You have already redeemed this code.' };
    }
  }

  const planKeys = Array.isArray(detail.planKeysJson)
    ? detail.planKeysJson.filter((x): x is string => typeof x === 'string')
    : [];

  return {
    ok: true,
    campaignId: c.id,
    codeRaw: detail.codeRaw,
    publicTitle: detail.publicTitle,
    description: detail.description,
    discountType: detail.discountType,
    discountValue: detail.discountValue,
    durationMode: detail.durationMode,
    recurringCycles: detail.recurringCycles,
    stackingRule: detail.stackingRule,
    appliesToAllPlans: detail.appliesToAllPlans,
    planKeys,
  };
}
