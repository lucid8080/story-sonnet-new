import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  CUSTOMER_AUDIT_ACTIONS,
  recordCustomerAudit,
} from '@/lib/admin/customers/audit';
import { customerCreditsBodySchema } from '@/lib/validation/customerSchemas';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const adminId = gate.session.user!.id;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = customerCreditsBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { amount, reason, source } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({ where: { userId: id } });
      if (!profile) {
        return null;
      }
      const next = profile.creditBalance + amount;
      if (next < 0) {
        throw new Error('Credit balance cannot be negative');
      }
      const updated = await tx.profile.update({
        where: { userId: id },
        data: { creditBalance: next },
      });
      const entry = await tx.customerCreditLedger.create({
        data: {
          userId: id,
          type: 'manual_adjustment',
          amount,
          balanceAfter: next,
          reason,
          source: source ?? 'admin',
          createdByAdminId: adminId,
        },
      });
      await recordCustomerAudit(tx, {
        userId: id,
        actorAdminId: adminId,
        actionType: CUSTOMER_AUDIT_ACTIONS.CREDIT_ADJUST,
        reason,
        metadata: {
          amount,
          balanceBefore: profile.creditBalance,
          balanceAfter: next,
          ledgerId: entry.id,
        },
      });
      return { creditBalance: updated.creditBalance, ledgerId: entry.id };
    });

    if (!result) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    const status = msg.includes('negative') ? 400 : 500;
    console.error('[POST /api/admin/customers/[id]/credits]', e);
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
