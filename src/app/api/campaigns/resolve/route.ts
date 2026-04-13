import { NextResponse } from 'next/server';
import type { CampaignPlacementKey } from '@prisma/client';
import { auth } from '@/auth';
import { buildCampaignUserContext } from '@/lib/campaigns/context';
import { resolveCampaignPayloads } from '@/lib/campaigns/resolve';
import { getOrCreateCampaignSettings } from '@/lib/campaigns/settings';
import prisma from '@/lib/prisma';
import { CAMPAIGN_PLACEMENT_KEYS } from '@/lib/validation/campaignSchemas';

function isPlacement(s: string | null): s is CampaignPlacementKey {
  return Boolean(s && (CAMPAIGN_PLACEMENT_KEYS as readonly string[]).includes(s));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const placementParam = url.searchParams.get('placement');
  if (!isPlacement(placementParam)) {
    return NextResponse.json({ ok: false, error: 'Invalid or missing placement' }, { status: 400 });
  }
  const pathname = url.searchParams.get('pathname')?.trim() || '/';
  const typesParam = url.searchParams.get('types');
  const types = typesParam
    ? (typesParam.split(',').filter(Boolean) as ('notification_bar' | 'trial_offer' | 'promo_code')[])
    : undefined;

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

  try {
    const items = await resolveCampaignPayloads(prisma, {
      now: new Date(),
      placement: placementParam,
      pathname,
      user,
      settings,
      previewMode,
      types: types?.length ? types : undefined,
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('[campaigns/resolve]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Resolve failed' },
      { status: 500 }
    );
  }
}
