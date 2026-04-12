import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  CUSTOMER_AUDIT_ACTIONS,
  recordCustomerAudit,
} from '@/lib/admin/customers/audit';
import { customerStatusBodySchema } from '@/lib/validation/customerSchemas';

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

  const parsed = customerStatusBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { accountStatus, reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.profile.findUnique({ where: { userId: id } });
      if (!before) return null;
      const updated = await tx.profile.update({
        where: { userId: id },
        data: { accountStatus },
      });
      await recordCustomerAudit(tx, {
        userId: id,
        actorAdminId: adminId,
        actionType: CUSTOMER_AUDIT_ACTIONS.STATUS_CHANGE,
        reason,
        metadata: {
          before: before.accountStatus,
          after: accountStatus,
        },
      });
      return updated;
    });

    if (!result) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: { accountStatus: result.accountStatus },
    });
  } catch (e) {
    console.error('[POST /api/admin/customers/[id]/status]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
