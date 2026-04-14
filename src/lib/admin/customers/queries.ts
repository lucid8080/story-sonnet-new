import type { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { CustomerListQuery } from '@/lib/validation/customerSchemas';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function buildCustomerWhere(
  query: CustomerListQuery
): Prisma.UserWhereInput {
  const {
    q,
    accountStatus,
    role,
    plan,
    joined,
    activity,
    flagged,
  } = query;

  const and: Prisma.UserWhereInput[] = [];

  const qTrim = q?.trim();
  if (qTrim) {
    and.push({
      OR: [
        { email: { contains: qTrim, mode: 'insensitive' } },
        { name: { contains: qTrim, mode: 'insensitive' } },
        { id: qTrim },
      ],
    });
  }

  if (accountStatus !== 'all') {
    and.push({
      profile: { is: { accountStatus } },
    });
  }

  if (role && role.trim()) {
    and.push({
      profile: { is: { role: role.trim() } },
    });
  }

  if (plan !== 'all') {
    if (plan === 'free') {
      and.push({
        profile: {
          is: {
            subscriptionStatus: { in: ['free', 'canceled'] },
          },
        },
      });
    } else if (plan === 'paying') {
      and.push({
        profile: {
          is: {
            subscriptionStatus: { in: ['active', 'trialing'] },
          },
        },
      });
    } else if (plan === 'past_due') {
      and.push({
        profile: { is: { subscriptionStatus: 'past_due' } },
      });
    } else if (plan === 'premium_profile') {
      and.push({
        OR: [
          { profile: { is: { isVip: true } } },
          {
            profile: {
              is: { subscriptionStatus: { in: ['active', 'trialing'] } },
            },
          },
        ],
      });
    }
  }

  if (joined === 'last7') {
    and.push({
      profile: { is: { createdAt: { gte: daysAgo(7) } } },
    });
  } else if (joined === 'last30') {
    and.push({
      profile: { is: { createdAt: { gte: daysAgo(30) } } },
    });
  }

  if (activity === 'active7') {
    and.push({
      profile: { is: { lastActiveAt: { gte: daysAgo(7) } } },
    });
  } else if (activity === 'inactive30') {
    and.push({
      OR: [
        { profile: { is: { lastActiveAt: { lt: daysAgo(30) } } } },
        { profile: { is: { lastActiveAt: null } } },
      ],
    });
  } else if (activity === 'never') {
    and.push({
      profile: { is: { lastActiveAt: null } },
    });
  } else if (activity === 'no_activity_after_signup') {
    const cutoff = daysAgo(1);
    and.push({
      profile: {
        is: {
          lastActiveAt: null,
          createdAt: { lt: cutoff },
        },
      },
    });
  }

  if (flagged === 'yes') {
    and.push({ profile: { is: { isFlagged: true } } });
  } else if (flagged === 'no') {
    and.push({ profile: { is: { isFlagged: false } } });
  }

  if (and.length === 0) return {};
  return { AND: and };
}

/** Narrows the customer list to first-claim trial state (see getFirstTrialClaimExpiresAt). */
export async function mergeTrialFilter(
  db: PrismaClient,
  where: Prisma.UserWhereInput,
  trial: CustomerListQuery['trial']
): Promise<Prisma.UserWhereInput> {
  if (trial === 'all') return where;
  if (trial === 'none') {
    return { AND: [where, { trialClaims: { none: {} } }] };
  }
  const rows =
    trial === 'active'
      ? await db.$queryRaw<{ user_id: string }[]>`
          WITH fc AS (
            SELECT DISTINCT ON (user_id) user_id, expires_at
            FROM trial_claims
            ORDER BY user_id, created_at ASC
          )
          SELECT user_id FROM fc
          WHERE expires_at IS NOT NULL AND expires_at > NOW()
        `
      : await db.$queryRaw<{ user_id: string }[]>`
          WITH fc AS (
            SELECT DISTINCT ON (user_id) user_id, expires_at
            FROM trial_claims
            ORDER BY user_id, created_at ASC
          )
          SELECT user_id FROM fc
          WHERE expires_at IS NULL OR expires_at <= NOW()
        `;
  const ids = rows.map((r) => r.user_id);
  if (ids.length === 0) {
    return { AND: [where, { id: { in: [] } }] };
  }
  return { AND: [where, { id: { in: ids } }] };
}

export function buildCustomerOrderBy(
  sort: CustomerListQuery['sort']
): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case 'created_asc':
      return [{ profile: { createdAt: 'asc' } }];
    case 'last_active_desc':
      return [{ profile: { lastActiveAt: 'desc' } }];
    case 'last_active_asc':
      return [{ profile: { lastActiveAt: 'asc' } }];
    case 'spend_desc':
      return [{ profile: { lifetimeSpendCents: 'desc' } }];
    case 'credits_desc':
      return [{ profile: { creditBalance: 'desc' } }];
    case 'usage_desc':
      return [{ profile: { totalEngagementCount: 'desc' } }];
    case 'email_asc':
      return [{ email: 'asc' }];
    case 'created_desc':
    default:
      return [{ profile: { createdAt: 'desc' } }];
  }
}

export async function getCustomerGlobalStats() {
  const now = new Date();
  const weekAgo = daysAgo(7);

  const [
    totalCustomers,
    activeAccounts,
    newThisWeek,
    paying,
    premiumStyle,
    withCredits,
    recentActivity,
    flagged,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { accountStatus: 'active' } }),
    prisma.profile.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.profile.count({
      where: { subscriptionStatus: { in: ['active', 'trialing'] } },
    }),
    prisma.profile.count({
      where: {
        OR: [
          { isVip: true },
          { subscriptionStatus: { in: ['active', 'trialing'] } },
        ],
      },
    }),
    prisma.profile.count({ where: { creditBalance: { gt: 0 } } }),
    prisma.profile.count({
      where: { lastActiveAt: { gte: weekAgo } },
    }),
    prisma.profile.count({ where: { isFlagged: true } }),
  ]);

  return {
    totalCustomers,
    activeCustomers: activeAccounts,
    newCustomersThisWeek: newThisWeek,
    payingCustomers: paying,
    premiumCustomers: premiumStyle,
    customersWithCredits: withCredits,
    recentActivityCustomers: recentActivity,
    flaggedCustomers: flagged,
    generatedAt: now.toISOString(),
  };
}
