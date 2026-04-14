import type { PrismaClient } from '@prisma/client';

/** Stripe-backed paid access (profile.subscriptionStatus from webhooks). */
export function isStripePayingOrTrialing(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
}

/**
 * End time of the user's app trial window. Only the chronologically first
 * {@link TrialClaim} counts; later claims never extend this date.
 */
export async function getFirstTrialClaimExpiresAt(
  prisma: PrismaClient,
  userId: string
): Promise<Date | null> {
  const first = await prisma.trialClaim.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { expiresAt: true },
  });
  return first?.expiresAt ?? null;
}

export function hasActiveAppTrial(firstClaimExpiresAt: Date | null, now: Date = new Date()): boolean {
  if (!firstClaimExpiresAt) return false;
  return firstClaimExpiresAt.getTime() > now.getTime();
}

/**
 * Premium playback: paying Stripe subscriber, or within the non-extendable app trial
 * window from the first trial claim.
 */
export async function userHasPremiumPlayback(
  prisma: PrismaClient,
  params: {
    userId: string;
    subscriptionStatus: string | null | undefined;
    now?: Date;
  }
): Promise<boolean> {
  if (isStripePayingOrTrialing(params.subscriptionStatus)) return true;
  const exp = await getFirstTrialClaimExpiresAt(prisma, params.userId);
  return hasActiveAppTrial(exp, params.now ?? new Date());
}
