import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { buildCampaignUserContext } from '@/lib/campaigns/context';
import {
  normalizePromoCodeInput,
  validatePromoCode,
} from '@/lib/campaigns/PromoCodeValidator';
import { getOrCreateCampaignSettings } from '@/lib/campaigns/settings';
import { rateLimitKey } from '@/lib/campaigns/rateLimit';
import { promoValidateBodySchema } from '@/lib/validation/campaignSchemas';
import prisma from '@/lib/prisma';

function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimitKey(`pval:${ip}`, 60, 60_000)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = promoValidateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const session = await auth();
  const settings = await getOrCreateCampaignSettings(prisma);
  const previewHeaderValue = req.headers.get(settings.previewHeaderName) ?? '';
  const previewMode = Boolean(
    settings.previewHeaderSecret && previewHeaderValue === settings.previewHeaderSecret
  );

  let profile = null;
  let hadPaidPurchase = false;
  const userId = session?.user?.id;
  if (userId) {
    const [p, paidCount] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: {
          subscriptionStatus: true,
          subscriptionPlan: true,
          createdAt: true,
          lifetimeSpendCents: true,
        },
      }),
      prisma.customerPurchase.count({
        where: { userId, status: 'paid', amountCents: { gt: 0 } },
      }),
    ]);
    profile = p;
    hadPaidPurchase = paidCount > 0 || (p?.lifetimeSpendCents ?? 0) > 0;
  }

  const user = buildCampaignUserContext({ session, profile, hadPaidPurchase });

  const result = await validatePromoCode(prisma, {
    code: parsed.data.code,
    user,
    planKey: parsed.data.planKey,
    previewMode,
  });

  if (result.ok) {
    await prisma.campaignAnalyticsEvent.create({
      data: {
        campaignId: result.campaignId,
        type: 'promo_validate_ok',
        userId: userId ?? undefined,
        metadata: {},
      },
    });
    return NextResponse.json({ ok: true, promo: result });
  }

  const failedDetail = await prisma.promoCodeDetail.findUnique({
    where: { codeNormalized: normalizePromoCodeInput(parsed.data.code) },
    select: { campaignId: true },
  });
  if (failedDetail) {
    await prisma.campaignAnalyticsEvent.create({
      data: {
        campaignId: failedDetail.campaignId,
        type: 'promo_validate_fail',
        userId: userId ?? undefined,
        metadata: { error: result.code },
      },
    });
  }

  return NextResponse.json({ ok: false, error: result.message, code: result.code }, { status: 400 });
}
