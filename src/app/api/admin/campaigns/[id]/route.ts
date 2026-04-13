import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { recordCampaignStatusChange } from '@/lib/admin/campaigns/statusHistory';
import { campaignPatchBodySchema } from '@/lib/validation/campaignSchemas';
import prisma from '@/lib/prisma';

function parseIso(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  try {
    const row = await prisma.campaign.findUnique({
      where: { id },
      include: {
        placements: true,
        notificationDetail: true,
        trialDetail: true,
        promoDetail: true,
      },
    });
    if (!row) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, item: row });
  } catch (e) {
    console.error('[admin/campaigns/[id] GET]', e);
    return NextResponse.json({ ok: false, error: 'Load failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const adminId = gate.session.user!.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = campaignPatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    let startsAt: Date | undefined;
    if (data.startsAt) {
      const s = parseIso(data.startsAt);
      if (!s) return NextResponse.json({ ok: false, error: 'Invalid startsAt' }, { status: 400 });
      startsAt = s;
    }
    let endsAt: Date | undefined;
    if (data.endsAt) {
      const e = parseIso(data.endsAt);
      if (!e) return NextResponse.json({ ok: false, error: 'Invalid endsAt' }, { status: 400 });
      endsAt = e;
    }
    const nextStart = startsAt ?? existing.startsAt;
    const nextEnd = endsAt ?? existing.endsAt;
    if (nextEnd < nextStart) {
      return NextResponse.json({ ok: false, error: 'endsAt must be after startsAt' }, { status: 400 });
    }

    const publishedAt =
      data.publishedAt === undefined
        ? undefined
        : data.publishedAt === null
          ? null
          : parseIso(data.publishedAt);
    if (data.publishedAt && data.publishedAt !== null && !publishedAt) {
      return NextResponse.json({ ok: false, error: 'Invalid publishedAt' }, { status: 400 });
    }

    const archivedAt =
      data.archivedAt === undefined
        ? undefined
        : data.archivedAt === null
          ? null
          : parseIso(data.archivedAt);
    if (data.archivedAt && data.archivedAt !== null && !archivedAt) {
      return NextResponse.json({ ok: false, error: 'Invalid archivedAt' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.placements?.length) {
        await tx.campaignPlacement.deleteMany({ where: { campaignId: id } });
        await tx.campaignPlacement.createMany({
          data: data.placements.map((placement) => ({ campaignId: id, placement })),
        });
      }

      if (data.notification && existing.type === 'notification_bar') {
        const n = data.notification;
        await tx.notificationBarDetail.update({
          where: { campaignId: id },
          data: {
            messagePrimary: n.messagePrimary,
            messageSecondary: n.messageSecondary ?? undefined,
            ctaLabel: n.ctaLabel ?? undefined,
            ctaUrl: n.ctaUrl ?? undefined,
            dismissible: n.dismissible ?? undefined,
            dismissPolicy: n.dismissPolicy ?? undefined,
            iconOrBadgeText: n.iconOrBadgeText ?? undefined,
            bgVariant: n.bgVariant ?? undefined,
            textVariant: n.textVariant ?? undefined,
            audience: n.audience ?? undefined,
            ...(n.barBackgroundHex !== undefined ? { barBackgroundHex: n.barBackgroundHex } : {}),
          },
        });
      }

      if (data.trial && existing.type === 'trial_offer') {
        const tr = data.trial;
        await tx.trialOfferDetail.update({
          where: { campaignId: id },
          data: {
            ...(tr.headline !== undefined ? { headline: tr.headline } : {}),
            ...(tr.subheadline !== undefined ? { subheadline: tr.subheadline } : {}),
            ...(tr.badgeText !== undefined ? { badgeText: tr.badgeText } : {}),
            ...(tr.ctaLabel !== undefined ? { ctaLabel: tr.ctaLabel } : {}),
            ...(tr.offerKind !== undefined ? { offerKind: tr.offerKind } : {}),
            ...(tr.durationDays !== undefined ? { durationDays: tr.durationDays } : {}),
            ...(tr.eligibilityJson !== undefined
              ? { eligibilityJson: tr.eligibilityJson as Prisma.InputJsonValue }
              : {}),
            ...(tr.maxTotalRedemptions !== undefined ? { maxTotalRedemptions: tr.maxTotalRedemptions } : {}),
            ...(tr.maxPerUser !== undefined ? { maxPerUser: tr.maxPerUser } : {}),
            ...(tr.unlimitedRedemptions !== undefined
              ? { unlimitedRedemptions: tr.unlimitedRedemptions }
              : {}),
            ...(tr.autoApplySignup !== undefined ? { autoApplySignup: tr.autoApplySignup } : {}),
            ...(tr.linkedPromoCampaignId !== undefined
              ? { linkedPromoCampaignId: tr.linkedPromoCampaignId }
              : {}),
            ...(tr.landingSlug !== undefined ? { landingSlug: tr.landingSlug } : {}),
            ...(tr.barBackgroundHex !== undefined ? { barBackgroundHex: tr.barBackgroundHex } : {}),
          },
        });
      }

      if (data.promo && existing.type === 'promo_code') {
        const patch = data.promo;
        const codeNormalized =
          patch.codeRaw !== undefined ? patch.codeRaw.trim().toLowerCase() : undefined;
        await tx.promoCodeDetail.update({
          where: { campaignId: id },
          data: {
            ...(patch.codeRaw !== undefined ? { codeRaw: patch.codeRaw.trim() } : {}),
            ...(codeNormalized !== undefined ? { codeNormalized } : {}),
            ...(patch.publicTitle !== undefined ? { publicTitle: patch.publicTitle } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            ...(patch.discountType !== undefined ? { discountType: patch.discountType } : {}),
            ...(patch.discountValue !== undefined ? { discountValue: patch.discountValue } : {}),
            ...(patch.appliesToAllPlans !== undefined ? { appliesToAllPlans: patch.appliesToAllPlans } : {}),
            ...(patch.planKeysJson !== undefined
              ? { planKeysJson: patch.planKeysJson as Prisma.InputJsonValue }
              : {}),
            ...(patch.durationMode !== undefined ? { durationMode: patch.durationMode } : {}),
            ...(patch.recurringCycles !== undefined ? { recurringCycles: patch.recurringCycles } : {}),
            ...(patch.stackingRule !== undefined ? { stackingRule: patch.stackingRule } : {}),
            ...(patch.firstPurchaseOnly !== undefined ? { firstPurchaseOnly: patch.firstPurchaseOnly } : {}),
            ...(patch.loggedInOnly !== undefined ? { loggedInOnly: patch.loggedInOnly } : {}),
            ...(patch.newUsersOnly !== undefined ? { newUsersOnly: patch.newUsersOnly } : {}),
            ...(patch.newUserMaxAgeDays !== undefined ? { newUserMaxAgeDays: patch.newUserMaxAgeDays } : {}),
            ...(patch.onePerAccount !== undefined ? { onePerAccount: patch.onePerAccount } : {}),
            ...(patch.maxUsesTotal !== undefined ? { maxUsesTotal: patch.maxUsesTotal } : {}),
            ...(patch.maxUsesPerUser !== undefined ? { maxUsesPerUser: patch.maxUsesPerUser } : {}),
            ...(patch.unlimitedUses !== undefined ? { unlimitedUses: patch.unlimitedUses } : {}),
          },
        });
      }

      const nextStatus = data.status ?? existing.status;
      let nextPublished: Date | null | undefined =
        publishedAt !== undefined ? publishedAt : undefined;
      if (
        (data.status === 'active' || data.status === 'scheduled') &&
        publishedAt === undefined &&
        !existing.publishedAt
      ) {
        nextPublished = new Date();
      }

      const row = await tx.campaign.update({
        where: { id },
        data: {
          ...(data.internalName !== undefined ? { internalName: data.internalName.trim() } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.priority !== undefined ? { priority: data.priority } : {}),
          ...(data.pinnedHighest !== undefined ? { pinnedHighest: data.pinnedHighest } : {}),
          ...(startsAt !== undefined ? { startsAt } : {}),
          ...(endsAt !== undefined ? { endsAt } : {}),
          ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
          ...(nextPublished !== undefined ? { publishedAt: nextPublished } : {}),
          ...(archivedAt !== undefined ? { archivedAt } : {}),
        },
      });

      if (data.status !== undefined && data.status !== existing.status) {
        await recordCampaignStatusChange(tx, {
          campaignId: id,
          fromStatus: existing.status,
          toStatus: nextStatus,
          actorUserId: adminId,
        });
      }

      return row;
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (e) {
    console.error('[admin/campaigns/[id] PATCH]', e);
    const msg = e instanceof Error ? e.message : 'Update failed';
    if (msg.includes('Unique constraint') || msg.includes('unique constraint')) {
      return NextResponse.json({ ok: false, error: 'Duplicate promo code.' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
