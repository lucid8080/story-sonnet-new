import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  buildCustomerOrderBy,
  buildCustomerWhere,
  getCustomerGlobalStats,
  mergeTrialFilter,
} from '@/lib/admin/customers/queries';
import { customerListQuerySchema } from '@/lib/validation/customerSchemas';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = customerListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const q = parsed.data;
  const filter = buildCustomerWhere(q);
  let where: Prisma.UserWhereInput = {
    AND: [filter, { profile: { isNot: null } }],
  };
  where = await mergeTrialFilter(prisma, where, q.trial);
  const orderBy = buildCustomerOrderBy(q.sort);
  const skip = (q.page - 1) * q.pageSize;

  try {
    const [total, rows, stats] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: q.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              role: true,
              accountStatus: true,
              subscriptionStatus: true,
              subscriptionPlan: true,
              creditBalance: true,
              lifetimeSpendCents: true,
              totalEngagementCount: true,
              lastActiveAt: true,
              createdAt: true,
              isFlagged: true,
              isVip: true,
              stripeCustomerId: true,
            },
          },
        },
      }),
      getCustomerGlobalStats(),
    ]);

    const firstTrialByUser = new Map<
      string,
      { expiresAt: Date | null }
    >();
    if (rows.length > 0) {
      const claims = await prisma.trialClaim.findMany({
        where: { userId: { in: rows.map((r) => r.id) } },
        orderBy: { createdAt: 'asc' },
        select: { userId: true, expiresAt: true },
      });
      for (const c of claims) {
        if (!firstTrialByUser.has(c.userId)) {
          firstTrialByUser.set(c.userId, { expiresAt: c.expiresAt });
        }
      }
    }

    const purchaseMap = new Map<string, number>();
    if (rows.length > 0) {
      const purchaseCounts = await prisma.customerPurchase.groupBy({
        by: ['userId'],
        _count: { id: true },
        where: {
          userId: { in: rows.map((r) => r.id) },
        },
      });
      for (const p of purchaseCounts) {
        purchaseMap.set(p.userId, p._count.id);
      }
    }

    const now = new Date();
    const items = rows.map((u) => {
      const p = u.profile;
      const ft = firstTrialByUser.get(u.id);
      const exp = ft?.expiresAt ?? null;
      let appTrialState: 'none' | 'active' | 'ended' = 'none';
      if (ft) {
        if (!exp) appTrialState = 'ended';
        else if (exp.getTime() > now.getTime()) appTrialState = 'active';
        else appTrialState = 'ended';
      }
      return {
        id: u.id,
        name: u.name ?? p?.fullName ?? null,
        email: u.email,
        image: resolvePublicAssetUrl(u.image ?? p?.avatarUrl ?? null),
        role: p?.role ?? 'user',
        accountStatus: p?.accountStatus ?? 'active',
        subscriptionStatus: p?.subscriptionStatus ?? 'free',
        subscriptionPlan: p?.subscriptionPlan ?? null,
        creditBalance: p?.creditBalance ?? 0,
        lifetimeSpendCents: p?.lifetimeSpendCents ?? 0,
        totalOrders: purchaseMap.get(u.id) ?? 0,
        usageCount: p?.totalEngagementCount ?? 0,
        lastActiveAt: p?.lastActiveAt?.toISOString() ?? null,
        createdAt: p?.createdAt?.toISOString() ?? new Date(0).toISOString(),
        isFlagged: p?.isFlagged ?? false,
        isVip: p?.isVip ?? false,
        stripeCustomerId: p?.stripeCustomerId ? '••••' : null,
        appTrialState,
        appTrialFirstClaimExpiresAt: exp?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        stats,
        page: q.page,
        pageSize: q.pageSize,
        total,
        items,
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/customers]', e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Query failed',
      },
      { status: 500 }
    );
  }
}
