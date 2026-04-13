import { headers } from 'next/headers';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { buildCampaignUserContext } from '@/lib/campaigns/context';
import { resolveFirstCampaignPayload } from '@/lib/campaigns/resolve';
import { getOrCreateCampaignSettings } from '@/lib/campaigns/settings';
import { CampaignBarRenderer } from './CampaignBarRenderer';

export async function ActiveCampaignBarGate() {
  const h = await headers();
  const pathname = h.get('x-pathname') || '/';
  if (pathname.startsWith('/admin')) return null;
  if (!process.env.DATABASE_URL) return null;

  try {
    const session = await auth();
    const settings = await getOrCreateCampaignSettings(prisma);
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

    const payload = await resolveFirstCampaignPayload(prisma, {
      now: new Date(),
      placement: 'global_top_bar',
      pathname,
      user,
      settings,
      previewMode: false,
      types: ['notification_bar', 'trial_offer'],
    });

    if (!payload || (payload.kind !== 'notification_bar' && payload.kind !== 'trial_offer')) {
      return null;
    }

    if (payload.kind === 'trial_offer') {
      const merged = {
        ...payload,
        dismissPolicy: settings.defaultBarDismissPolicy,
      };
      return <CampaignBarRenderer payload={merged} />;
    }

    return <CampaignBarRenderer payload={payload} />;
  } catch (e) {
    console.warn('[ActiveCampaignBarGate]', e);
    return null;
  }
}
