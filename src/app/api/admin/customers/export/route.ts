import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  buildCustomerOrderBy,
  buildCustomerWhere,
} from '@/lib/admin/customers/queries';
import { customerListQuerySchema } from '@/lib/validation/customerSchemas';

const MAX_EXPORT = 10_000;

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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
  const idsParam = url.searchParams.get('ids');
  let where: Prisma.UserWhereInput;

  if (idsParam?.trim()) {
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    where = {
      AND: [
        { id: { in: ids } },
        { profile: { isNot: null } },
      ],
    };
  } else {
    where = {
      AND: [filter, { profile: { isNot: null } }],
    };
  }

  const orderBy = buildCustomerOrderBy(q.sort);

  try {
    const rows = await prisma.user.findMany({
      where,
      orderBy,
      take: MAX_EXPORT,
      select: {
        id: true,
        name: true,
        email: true,
        profile: {
          select: {
            fullName: true,
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
            marketingOptIn: true,
          },
        },
      },
    });

    const header = [
      'id',
      'email',
      'name',
      'full_name',
      'role',
      'account_status',
      'subscription_status',
      'subscription_plan',
      'credit_balance',
      'lifetime_spend_cents',
      'usage_count',
      'last_active_at',
      'created_at',
      'is_flagged',
      'is_vip',
      'marketing_opt_in',
    ];

    const lines = [
      header.join(','),
      ...rows.map((u) => {
        const p = u.profile;
        return [
          csvEscape(u.id),
          csvEscape(u.email),
          csvEscape(u.name),
          csvEscape(p?.fullName),
          csvEscape(p?.role),
          csvEscape(p?.accountStatus),
          csvEscape(p?.subscriptionStatus),
          csvEscape(p?.subscriptionPlan),
          csvEscape(p?.creditBalance),
          csvEscape(p?.lifetimeSpendCents),
          csvEscape(p?.totalEngagementCount),
          csvEscape(p?.lastActiveAt?.toISOString() ?? ''),
          csvEscape(p?.createdAt?.toISOString() ?? ''),
          csvEscape(p?.isFlagged),
          csvEscape(p?.isVip),
          csvEscape(p?.marketingOptIn),
        ].join(',');
      }),
    ];

    const csv = lines.join('\r\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/customers/export]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Export failed' },
      { status: 500 }
    );
  }
}
