import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  campaignCreateBodySchema,
  campaignListQuerySchema,
} from '@/lib/validation/campaignSchemas';
import prisma from '@/lib/prisma';
import { recordCampaignStatusChange } from '@/lib/admin/campaigns/statusHistory';

function parseIso(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = campaignListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { type, status, placement, q, take, skip } = parsed.data;

  const where: Prisma.CampaignWhereInput = {
    archivedAt: null,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(placement ? { placements: { some: { placement } } } : {}),
    ...(q?.trim()
      ? {
          internalName: { contains: q.trim(), mode: 'insensitive' },
        }
      : {}),
  };

  try {
    const [items, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        take,
        skip,
        include: {
          placements: true,
          notificationDetail: true,
          trialDetail: true,
          promoDetail: true,
        },
      }),
      prisma.campaign.count({ where }),
    ]);
    return NextResponse.json({ ok: true, items, total });
  } catch (e) {
    console.error('[admin/campaigns GET]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'List failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = campaignCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const startsAt = parseIso(data.startsAt);
  const endsAt = parseIso(data.endsAt);
  if (!startsAt || !endsAt || endsAt < startsAt) {
    return NextResponse.json({ ok: false, error: 'Invalid startsAt/endsAt' }, { status: 400 });
  }

  const adminId = gate.session.user!.id;
  const status = data.status ?? 'draft';

  try {
    const base = {
      type: data.type,
      status,
      internalName: data.internalName.trim(),
      priority: data.priority ?? 0,
      pinnedHighest: data.pinnedHighest ?? false,
      startsAt,
      endsAt,
      timezone: data.timezone?.trim() || 'UTC',
      createdByUserId: adminId,
      publishedAt: status === 'active' || status === 'scheduled' ? new Date() : null,
      placements: {
        create: data.placements.map((placement) => ({ placement })),
      },
    };

    let created;
    if (data.type === 'notification_bar' && data.notification) {
      const n = data.notification;
      created = await prisma.campaign.create({
        data: {
          ...base,
          notificationDetail: {
            create: {
              messagePrimary: n.messagePrimary,
              messageSecondary: n.messageSecondary ?? null,
              ctaLabel: n.ctaLabel ?? null,
              ctaUrl: n.ctaUrl ?? null,
              dismissible: n.dismissible ?? true,
              dismissPolicy: n.dismissPolicy ?? 'session',
              iconOrBadgeText: n.iconOrBadgeText ?? null,
              bgVariant: n.bgVariant ?? 'brand',
              textVariant: n.textVariant ?? 'light',
              audience: n.audience ?? 'all',
              barBackgroundHex: n.barBackgroundHex ?? null,
            },
          },
        },
      });
    } else if (data.type === 'trial_offer' && data.trial) {
      const t = data.trial;
      created = await prisma.campaign.create({
        data: {
          ...base,
          trialDetail: {
            create: {
              headline: t.headline,
              subheadline: t.subheadline ?? null,
              badgeText: t.badgeText ?? null,
              ctaLabel: t.ctaLabel ?? 'Start trial',
              offerKind: t.offerKind ?? 'fixed_duration',
              durationDays: t.durationDays ?? 7,
              eligibilityJson: (t.eligibilityJson ?? {}) as Prisma.InputJsonValue,
              maxTotalRedemptions: t.maxTotalRedemptions ?? null,
              maxPerUser: t.maxPerUser ?? null,
              unlimitedRedemptions: t.unlimitedRedemptions ?? true,
              autoApplySignup: t.autoApplySignup ?? false,
              linkedPromoCampaignId: t.linkedPromoCampaignId ?? null,
              landingSlug: t.landingSlug ?? null,
              barBackgroundHex: t.barBackgroundHex ?? null,
            },
          },
        },
      });
    } else if (data.type === 'promo_code' && data.promo) {
      const p = data.promo;
      const codeNormalized = p.codeRaw.trim().toLowerCase();
      created = await prisma.campaign.create({
        data: {
          ...base,
          promoDetail: {
            create: {
              codeRaw: p.codeRaw.trim(),
              codeNormalized,
              publicTitle: p.publicTitle,
              description: p.description ?? '',
              discountType: p.discountType,
              discountValue: p.discountValue,
              appliesToAllPlans: p.appliesToAllPlans ?? true,
              planKeysJson: (p.planKeysJson ?? []) as Prisma.InputJsonValue,
              durationMode: p.durationMode ?? 'once',
              recurringCycles: p.recurringCycles ?? null,
              stackingRule: p.stackingRule ?? 'none',
              firstPurchaseOnly: p.firstPurchaseOnly ?? false,
              loggedInOnly: p.loggedInOnly ?? false,
              newUsersOnly: p.newUsersOnly ?? false,
              newUserMaxAgeDays: p.newUserMaxAgeDays ?? null,
              onePerAccount: p.onePerAccount ?? true,
              maxUsesTotal: p.maxUsesTotal ?? null,
              maxUsesPerUser: p.maxUsesPerUser ?? null,
              unlimitedUses: p.unlimitedUses ?? true,
            },
          },
        },
      });
    } else {
      return NextResponse.json({ ok: false, error: 'Unsupported campaign type payload' }, { status: 400 });
    }

    await recordCampaignStatusChange(prisma, {
      campaignId: created.id,
      fromStatus: null,
      toStatus: created.status,
      actorUserId: adminId,
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error('[admin/campaigns POST]', e);
    const msg = e instanceof Error ? e.message : 'Create failed';
    if (msg.includes('Unique constraint') || msg.includes('unique constraint')) {
      return NextResponse.json({ ok: false, error: 'Duplicate promo code or conflict.' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
