import type { PrismaClient } from '@prisma/client';
import { getEffectiveAppTrialExpiresAt, hasActiveAppTrial } from '@/lib/billing/premiumAccess';
import { CUSTOMER_AUDIT_ACTIONS, recordCustomerAudit } from './audit';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type GrantAppTrialResult =
  | {
      ok: true;
      claimId: string;
      campaignId: string;
      expiresAt: string;
      effectiveExpiresAt: string | null;
      extended: boolean;
    }
  | { ok: false; code: string; message: string };

/**
 * When extending, add `durationDays` from the later of now or the current expiry.
 * New claims start from `now`.
 */
export function computeAppTrialExpiresAt(params: {
  now: Date;
  durationDays: number;
  existingExpiresAt?: Date | null;
}): Date {
  const { now, durationDays, existingExpiresAt } = params;
  if (durationDays <= 0) {
    throw new Error('durationDays must be positive');
  }
  let baseMs = now.getTime();
  if (existingExpiresAt && existingExpiresAt.getTime() > baseMs) {
    baseMs = existingExpiresAt.getTime();
  }
  return new Date(baseMs + durationDays * MS_PER_DAY);
}

export async function grantAppTrialForUser(
  prisma: PrismaClient,
  params: {
    userId: string;
    campaignId: string;
    adminId: string;
    reason: string;
    durationDays?: number;
    now?: Date;
  }
): Promise<GrantAppTrialResult> {
  const now = params.now ?? new Date();

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true },
  });
  if (!user) {
    return { ok: false, code: 'not_found', message: 'Customer not found.' };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
    include: { trialDetail: true },
  });
  if (!campaign || campaign.type !== 'trial_offer' || !campaign.trialDetail) {
    return {
      ok: false,
      code: 'invalid_campaign',
      message: 'Campaign must be a free trial offer.',
    };
  }

  const durationDays =
    params.durationDays ?? campaign.trialDetail.durationDays ?? 7;
  if (durationDays <= 0) {
    return {
      ok: false,
      code: 'invalid_duration',
      message: 'Trial duration must be at least 1 day.',
    };
  }

  const existing = await prisma.trialClaim.findUnique({
    where: {
      campaignId_userId: {
        campaignId: params.campaignId,
        userId: params.userId,
      },
    },
  });

  const expiresAt = computeAppTrialExpiresAt({
    now,
    durationDays,
    existingExpiresAt: existing?.expiresAt,
  });

  const claim = await prisma.$transaction(async (tx) => {
    const row = existing
      ? await tx.trialClaim.update({
          where: { id: existing.id },
          data: { expiresAt },
        })
      : await tx.trialClaim.create({
          data: {
            campaignId: params.campaignId,
            userId: params.userId,
            expiresAt,
          },
        });

    await recordCustomerAudit(tx, {
      userId: params.userId,
      actorAdminId: params.adminId,
      actionType: CUSTOMER_AUDIT_ACTIONS.APP_TRIAL_GRANT,
      reason: params.reason,
      metadata: {
        campaignId: params.campaignId,
        campaignInternalName: campaign.internalName,
        durationDays,
        extended: Boolean(existing),
        claimId: row.id,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return row;
  });

  const effectiveExpiresAt = await getEffectiveAppTrialExpiresAt(prisma, params.userId);

  return {
    ok: true,
    claimId: claim.id,
    campaignId: params.campaignId,
    expiresAt: expiresAt.toISOString(),
    effectiveExpiresAt: effectiveExpiresAt?.toISOString() ?? null,
    extended: Boolean(existing),
  };
}

export async function getCustomerAppTrialSummary(
  prisma: PrismaClient,
  userId: string,
  subscriptionStatus: string | null | undefined,
  now: Date = new Date()
) {
  const [effectiveExpiresAt, claims] = await Promise.all([
    getEffectiveAppTrialExpiresAt(prisma, userId),
    prisma.trialClaim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        campaign: { select: { id: true, internalName: true, status: true } },
      },
    }),
  ]);

  let state: 'none' | 'active' | 'ended' = 'none';
  if (claims.length > 0) {
    state = hasActiveAppTrial(effectiveExpiresAt, now) ? 'active' : 'ended';
  }

  return {
    effectiveExpiresAt: effectiveExpiresAt?.toISOString() ?? null,
    state,
    claims: claims.map((c) => ({
      id: c.id,
      campaignId: c.campaignId,
      campaignName: c.campaign.internalName,
      campaignStatus: c.campaign.status,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}
