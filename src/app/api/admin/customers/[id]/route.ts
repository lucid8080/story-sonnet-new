import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  CUSTOMER_AUDIT_ACTIONS,
  recordCustomerAudit,
} from '@/lib/admin/customers/audit';
import {
  computeEngagementTotals,
  syncProfileEngagementCount,
} from '@/lib/admin/customers/aggregates';
import { customerPatchSchema } from '@/lib/validation/customerSchemas';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!user || !user.profile) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    await syncProfileEngagementCount(id);
    const engagement = await computeEngagementTotals(id);

    const [purchaseCount, orderTotal, notesCount, sessionCount, ledgerRecent] =
      await Promise.all([
        prisma.customerPurchase.count({ where: { userId: id } }),
        prisma.customerPurchase.aggregate({
          where: { userId: id, status: { in: ['paid', 'complete'] } },
          _sum: { amountCents: true },
        }),
        prisma.customerAdminNote.count({ where: { userId: id } }),
        prisma.session.count({
          where: { userId: id, expires: { gt: new Date() } },
        }),
        prisma.customerCreditLedger.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            type: true,
            amount: true,
            balanceAfter: true,
            reason: true,
            source: true,
            createdAt: true,
          },
        }),
      ]);

    const p = user.profile;

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: resolvePublicAssetUrl(user.image),
          emailVerified: user.emailVerified?.toISOString() ?? null,
        },
        profile: {
          fullName: p.fullName,
          avatarUrl: resolvePublicAssetUrl(p.avatarUrl),
          role: p.role,
          accountStatus: p.accountStatus,
          subscriptionStatus: p.subscriptionStatus,
          subscriptionPlan: p.subscriptionPlan,
          stripeCustomerId: p.stripeCustomerId,
          creditBalance: p.creditBalance,
          lastActiveAt: p.lastActiveAt?.toISOString() ?? null,
          loginCount: p.loginCount,
          lifetimeSpendCents: p.lifetimeSpendCents,
          refundCount: p.refundCount,
          totalEngagementCount: p.totalEngagementCount,
          isFlagged: p.isFlagged,
          isVip: p.isVip,
          riskLevel: p.riskLevel,
          internalTags: p.internalTags,
          marketingOptIn: p.marketingOptIn,
          isGuardianManaged: p.isGuardianManaged,
          isMinorAccount: p.isMinorAccount,
          consentStatus: p.consentStatus,
          communicationRestricted: p.communicationRestricted,
          complianceNotes: p.complianceNotes,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        },
        engagement,
        billing: {
          purchaseCount,
          lifetimeSpendFromPurchasesCents: orderTotal._sum.amountCents ?? 0,
        },
        notesCount,
        activeSessionCount: sessionCount,
        creditLedgerPreview: ledgerRecent.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/customers/[id]]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

  const parsed = customerPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reason, ...rest } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!existing || !existing.profile) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    const userUpdate: { name?: string; email?: string } = {};
    if (rest.name !== undefined) userUpdate.name = rest.name;
    if (rest.email !== undefined) userUpdate.email = rest.email;

    const profileUpdate: Record<string, unknown> = {};
    if (rest.fullName !== undefined) profileUpdate.fullName = rest.fullName;
    if (rest.avatarUrl !== undefined) profileUpdate.avatarUrl = rest.avatarUrl;
    if (rest.subscriptionPlan !== undefined)
      profileUpdate.subscriptionPlan = rest.subscriptionPlan;
    if (rest.marketingOptIn !== undefined)
      profileUpdate.marketingOptIn = rest.marketingOptIn;
    if (rest.internalTags !== undefined)
      profileUpdate.internalTags = rest.internalTags;
    if (rest.isVip !== undefined) profileUpdate.isVip = rest.isVip;
    if (rest.isFlagged !== undefined) profileUpdate.isFlagged = rest.isFlagged;
    if (rest.riskLevel !== undefined) profileUpdate.riskLevel = rest.riskLevel;
    if (rest.isGuardianManaged !== undefined)
      profileUpdate.isGuardianManaged = rest.isGuardianManaged;
    if (rest.isMinorAccount !== undefined)
      profileUpdate.isMinorAccount = rest.isMinorAccount;
    if (rest.consentStatus !== undefined)
      profileUpdate.consentStatus = rest.consentStatus;
    if (rest.communicationRestricted !== undefined)
      profileUpdate.communicationRestricted = rest.communicationRestricted;
    if (rest.complianceNotes !== undefined)
      profileUpdate.complianceNotes = rest.complianceNotes;

    const before = {
      user: {
        name: existing.name,
        email: existing.email,
      },
      profile: existing.profile,
    };

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({ where: { id }, data: userUpdate });
      }
      if (Object.keys(profileUpdate).length > 0) {
        await tx.profile.update({
          where: { userId: id },
          data: profileUpdate as Prisma.ProfileUpdateInput,
        });
      }
      await recordCustomerAudit(tx, {
        userId: id,
        actorAdminId: adminId,
        actionType: CUSTOMER_AUDIT_ACTIONS.PROFILE_UPDATE,
        reason,
        metadata: {
          before,
          after: { userUpdate, profileUpdate },
        },
      });
    });

    return NextResponse.json({ ok: true, data: { id } });
  } catch (e) {
    console.error('[PATCH /api/admin/customers/[id]]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 }
    );
  }
}
