import type { Profile } from '@prisma/client';
import type { Session } from 'next-auth';
import type { CampaignUserContext } from './types';

export function buildCampaignUserContext(params: {
  session: Session | null;
  profile: Pick<
    Profile,
    'subscriptionStatus' | 'subscriptionPlan' | 'createdAt' | 'lifetimeSpendCents'
  > | null;
  hadPaidPurchase: boolean;
}): CampaignUserContext {
  const userId = params.session?.user?.id;
  const isLoggedIn = Boolean(userId);
  const subscriptionStatus =
    params.profile?.subscriptionStatus ??
    (params.session?.user as { subscriptionStatus?: string } | undefined)
      ?.subscriptionStatus ??
    'free';

  return {
    isLoggedIn,
    userId,
    subscriptionStatus,
    subscriptionPlan: params.profile?.subscriptionPlan ?? null,
    profileCreatedAt: params.profile?.createdAt ?? null,
    hadPaidPurchase: params.hadPaidPurchase,
    lifetimeSpendCents: params.profile?.lifetimeSpendCents ?? 0,
  };
}

export function isPayingSubscriber(status: string): boolean {
  return status === 'active' || status === 'trialing';
}
