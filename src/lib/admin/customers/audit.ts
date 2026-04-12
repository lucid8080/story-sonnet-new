import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export const CUSTOMER_AUDIT_ACTIONS = {
  PROFILE_UPDATE: 'profile.update',
  STATUS_CHANGE: 'account.status_change',
  CREDIT_ADJUST: 'credits.adjust',
  NOTE_CREATE: 'note.create',
  BULK: 'bulk',
  TAG_ADD: 'tags.add',
  TAG_REMOVE: 'tags.remove',
  FLAG: 'account.flag',
  VERIFY_EMAIL: 'account.verify_email_placeholder',
  VERIFY_EMAIL_MANUAL: 'account.verify_email_manual',
} as const;

export async function recordCustomerAudit(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    actorAdminId: string;
    actionType: string;
    reason?: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return tx.customerAuditLog.create({
    data: {
      userId: params.userId,
      actorAdminId: params.actorAdminId,
      actionType: params.actionType,
      reason: params.reason ?? '',
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function recordCustomerAuditStandalone(params: {
  userId: string;
  actorAdminId: string;
  actionType: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.customerAuditLog.create({
    data: {
      userId: params.userId,
      actorAdminId: params.actorAdminId,
      actionType: params.actionType,
      reason: params.reason ?? '',
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
