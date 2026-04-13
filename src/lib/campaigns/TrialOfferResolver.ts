import type { PrismaClient } from '@prisma/client';
import { trialEligibilityReason, parseTrialEligibility } from './audience';
import { isWithinSchedule, statusAllowsRender } from './schedule';
import { getOrCreateCampaignSettings, parseTestUserIds } from './settings';
import type { CampaignUserContext } from './types';

export type TrialClaimResult =
  | { ok: true; claimId: string; campaignId: string }
  | { ok: false; code: string; message: string };

export async function claimTrialOffer(
  prisma: PrismaClient,
  params: {
    campaignId: string;
    user: CampaignUserContext;
    now?: Date;
    previewMode?: boolean;
  }
): Promise<TrialClaimResult> {
  const now = params.now ?? new Date();
  const uid = params.user.userId;
  if (!uid) {
    return { ok: false, code: 'login_required', message: 'Sign in to claim this offer.' };
  }

  const settings = await getOrCreateCampaignSettings(prisma);
  if (settings.globalKillSwitch) {
    return { ok: false, code: 'inactive', message: 'Offers are temporarily unavailable.' };
  }
  if (settings.testModeEnabled && !params.previewMode) {
    const ids = parseTestUserIds(settings.testModeUserIdsJson);
    if (ids.length === 0 || !ids.includes(uid)) {
      return { ok: false, code: 'test_mode', message: 'Offers are in test mode.' };
    }
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
    include: { trialDetail: true },
  });

  if (!campaign || campaign.archivedAt || campaign.type !== 'trial_offer' || !campaign.trialDetail) {
    return { ok: false, code: 'not_found', message: 'Offer not found.' };
  }

  const statusOk =
    params.previewMode && campaign.status === 'draft'
      ? true
      : statusAllowsRender(campaign.status) && campaign.status !== 'draft';
  if (!statusOk) {
    return { ok: false, code: 'inactive', message: 'This offer is not active.' };
  }
  if (!params.previewMode || campaign.status !== 'draft') {
    if (!isWithinSchedule(campaign.startsAt, campaign.endsAt, now)) {
      return { ok: false, code: 'expired', message: 'This offer is not available right now.' };
    }
  }

  const rules = parseTrialEligibility(campaign.trialDetail.eligibilityJson);
  const elig = trialEligibilityReason(rules, params.user);
  if (!elig.ok) {
    return { ok: false, code: elig.code, message: elig.message };
  }

  const d = campaign.trialDetail;

  if (!d.unlimitedRedemptions && d.maxTotalRedemptions != null) {
    const n = await prisma.trialClaim.count({ where: { campaignId: campaign.id } });
    if (n >= d.maxTotalRedemptions) {
      return { ok: false, code: 'sold_out', message: 'This offer has reached its limit.' };
    }
  }

  if (d.maxPerUser != null) {
    const mine = await prisma.trialClaim.count({
      where: { campaignId: campaign.id, userId: uid },
    });
    if (mine >= d.maxPerUser) {
      return { ok: false, code: 'per_user_limit', message: 'You have already claimed this offer.' };
    }
  }

  try {
    const claim = await prisma.trialClaim.create({
      data: {
        campaignId: campaign.id,
        userId: uid,
        expiresAt:
          d.durationDays > 0
            ? new Date(now.getTime() + d.durationDays * 24 * 60 * 60 * 1000)
            : null,
      },
    });

    await prisma.campaignAnalyticsEvent.create({
      data: {
        campaignId: campaign.id,
        type: 'trial_claim',
        userId: uid,
        metadata: {},
      },
    });

    return { ok: true, claimId: claim.id, campaignId: campaign.id };
  } catch {
    return { ok: false, code: 'already_claimed', message: 'You have already claimed this offer.' };
  }
}
