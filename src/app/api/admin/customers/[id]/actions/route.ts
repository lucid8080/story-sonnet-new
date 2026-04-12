import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  CUSTOMER_AUDIT_ACTIONS,
  recordCustomerAudit,
} from '@/lib/admin/customers/audit';

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('impersonate_placeholder'),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('send_password_reset_placeholder'),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('resend_welcome_placeholder'),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('verify_email_manual'),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('reset_credits'),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('mark_premium'),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('remove_premium'),
    reason: z.string().min(3).max(2000),
  }),
]);

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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user || !user.profile) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    if (
      input.action === 'impersonate_placeholder' ||
      input.action === 'send_password_reset_placeholder' ||
      input.action === 'resend_welcome_placeholder'
    ) {
      await recordCustomerAuditStandalone({
        userId: id,
        actorAdminId: adminId,
        actionType: `placeholder.${input.action}`,
        reason: input.reason,
        metadata: { note: 'No integration wired; audit only.' },
      });
      return NextResponse.json({
        ok: true,
        data: { message: 'Recorded; integration not connected.' },
      });
    }

    if (input.action === 'verify_email_manual') {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: { emailVerified: new Date() },
        });
        await recordCustomerAudit(tx, {
          userId: id,
          actorAdminId: adminId,
          actionType: CUSTOMER_AUDIT_ACTIONS.VERIFY_EMAIL_MANUAL,
          reason: input.reason,
          metadata: { manual: true },
        });
      });
      return NextResponse.json({ ok: true, data: { emailVerified: true } });
    }

    if (input.action === 'reset_credits') {
      await prisma.$transaction(async (tx) => {
        const before = user.profile!.creditBalance;
        await tx.profile.update({
          where: { userId: id },
          data: { creditBalance: 0 },
        });
        await tx.customerCreditLedger.create({
          data: {
            userId: id,
            type: 'manual_adjustment',
            amount: -before,
            balanceAfter: 0,
            reason: input.reason,
            source: 'admin_reset',
            createdByAdminId: adminId,
          },
        });
        await recordCustomerAudit(tx, {
          userId: id,
          actorAdminId: adminId,
          actionType: CUSTOMER_AUDIT_ACTIONS.CREDIT_ADJUST,
          reason: input.reason,
          metadata: { reset: true, before, after: 0 },
        });
      });
      return NextResponse.json({ ok: true, data: { creditBalance: 0 } });
    }

    if (input.action === 'mark_premium' || input.action === 'remove_premium') {
      const isVip = input.action === 'mark_premium';
      await prisma.$transaction(async (tx) => {
        await tx.profile.update({
          where: { userId: id },
          data: { isVip },
        });
        await recordCustomerAudit(tx, {
          userId: id,
          actorAdminId: adminId,
          actionType: 'profile.premium_flag',
          reason: input.reason,
          metadata: { isVip },
        });
      });
      return NextResponse.json({ ok: true, data: { isVip } });
    }

    return NextResponse.json({ ok: false, error: 'Unsupported' }, { status: 400 });
  } catch (e) {
    console.error('[POST /api/admin/customers/[id]/actions]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
