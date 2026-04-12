import { NextResponse } from 'next/server';
import type { CreditLedgerType, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  CUSTOMER_AUDIT_ACTIONS,
  recordCustomerAudit,
} from '@/lib/admin/customers/audit';
import { bulkActionSchema } from '@/lib/validation/customerSchemas';

function parseTags(json: Prisma.JsonValue): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((t): t is string => typeof t === 'string');
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const adminId = gate.session.user!.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bulkActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const action = parsed.data;

  try {
    let affected = 0;

    if (action.action === 'add_tag' || action.action === 'remove_tag') {
      const tag = action.tag.trim().toLowerCase();
      for (const userId of action.userIds) {
        await prisma.$transaction(async (tx) => {
          const profile = await tx.profile.findUnique({ where: { userId } });
          if (!profile) return;
          const tags = parseTags(profile.internalTags);
          const next =
            action.action === 'add_tag'
              ? Array.from(new Set([...tags, tag]))
              : tags.filter((t) => t !== tag);
          await tx.profile.update({
            where: { userId },
            data: { internalTags: next },
          });
          await recordCustomerAudit(tx, {
            userId,
            actorAdminId: adminId,
            actionType: CUSTOMER_AUDIT_ACTIONS.BULK,
            reason: action.reason,
            metadata: {
              subAction: action.action,
              tag,
              before: tags,
              after: next,
            },
          });
          affected += 1;
        });
      }
    } else if (action.action === 'grant_credits') {
      for (const userId of action.userIds) {
        await prisma.$transaction(async (tx) => {
          const profile = await tx.profile.findUnique({ where: { userId } });
          if (!profile) return;
          const balance = profile.creditBalance + action.amount;
          await tx.profile.update({
            where: { userId },
            data: { creditBalance: balance },
          });
          await tx.customerCreditLedger.create({
            data: {
              userId,
              type: 'grant' as CreditLedgerType,
              amount: action.amount,
              balanceAfter: balance,
              reason: action.reason,
              source: 'bulk_grant',
              createdByAdminId: adminId,
            },
          });
          await recordCustomerAudit(tx, {
            userId,
            actorAdminId: adminId,
            actionType: CUSTOMER_AUDIT_ACTIONS.CREDIT_ADJUST,
            reason: action.reason,
            metadata: {
              bulk: true,
              amount: action.amount,
              balanceAfter: balance,
            },
          });
          affected += 1;
        });
      }
    } else if (action.action === 'suspend') {
      for (const userId of action.userIds) {
        await prisma.$transaction(async (tx) => {
          const before = await tx.profile.findUnique({ where: { userId } });
          if (!before) return;
          await tx.profile.update({
            where: { userId },
            data: { accountStatus: 'suspended' },
          });
          await recordCustomerAudit(tx, {
            userId,
            actorAdminId: adminId,
            actionType: CUSTOMER_AUDIT_ACTIONS.STATUS_CHANGE,
            reason: action.reason,
            metadata: {
              bulk: true,
              before: before.accountStatus,
              after: 'suspended',
            },
          });
          affected += 1;
        });
      }
    } else if (action.action === 'activate') {
      for (const userId of action.userIds) {
        await prisma.$transaction(async (tx) => {
          const before = await tx.profile.findUnique({ where: { userId } });
          if (!before) return;
          await tx.profile.update({
            where: { userId },
            data: { accountStatus: 'active' },
          });
          await recordCustomerAudit(tx, {
            userId,
            actorAdminId: adminId,
            actionType: CUSTOMER_AUDIT_ACTIONS.STATUS_CHANGE,
            reason: action.reason,
            metadata: {
              bulk: true,
              before: before.accountStatus,
              after: 'active',
            },
          });
          affected += 1;
        });
      }
    } else if (action.action === 'flag' || action.action === 'unflag') {
      const val = action.action === 'flag';
      for (const userId of action.userIds) {
        await prisma.$transaction(async (tx) => {
          const before = await tx.profile.findUnique({ where: { userId } });
          if (!before) return;
          await tx.profile.update({
            where: { userId },
            data: { isFlagged: val },
          });
          await recordCustomerAudit(tx, {
            userId,
            actorAdminId: adminId,
            actionType: CUSTOMER_AUDIT_ACTIONS.FLAG,
            reason: action.reason,
            metadata: {
              bulk: true,
              before: before.isFlagged,
              after: val,
            },
          });
          affected += 1;
        });
      }
    } else if (action.action === 'add_note_template') {
      for (const userId of action.userIds) {
        await prisma.$transaction(async (tx) => {
          const u = await tx.user.findUnique({ where: { id: userId } });
          if (!u) return;
          await tx.customerAdminNote.create({
            data: {
              userId,
              authorAdminId: adminId,
              body: action.template,
              visibility: 'internal',
            },
          });
          await recordCustomerAudit(tx, {
            userId,
            actorAdminId: adminId,
            actionType: CUSTOMER_AUDIT_ACTIONS.NOTE_CREATE,
            reason: action.reason,
            metadata: { bulk: true, template: true },
          });
          affected += 1;
        });
      }
    }

    return NextResponse.json({ ok: true, data: { affected } });
  } catch (e) {
    console.error('[POST /api/admin/customers/bulk]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Bulk failed' },
      { status: 500 }
    );
  }
}
