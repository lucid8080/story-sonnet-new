import type { PrismaClient } from '@prisma/client';

/** Stripe-backed paid access (profile.subscriptionStatus from webhooks). */
export function isStripePayingOrTrialing(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
}

/**
 * End time of the user's app trial window.
 * We honor the best available claim window by taking the maximum `expiresAt`
 * across the user's claims.
 */
export async function getEffectiveAppTrialExpiresAt(
  prisma: PrismaClient,
  userId: string
): Promise<Date | null> {
  const latest = await prisma.trialClaim.findFirst({
    where: { userId },
    orderBy: { expiresAt: 'desc' },
    select: { expiresAt: true },
  });
  return latest?.expiresAt ?? null;
}

export function hasActiveAppTrial(expiresAt: Date | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() > now.getTime();
}

/**
 * Premium playback: paying Stripe subscriber, or within the app trial window
 * from the user's best available claim expiry.
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
  const exp = await getEffectiveAppTrialExpiresAt(prisma, params.userId);
  return hasActiveAppTrial(exp, params.now ?? new Date());
}
