import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import prisma from '@/lib/prisma';

export async function GET(req: Request, ctx: { params: Promise<{ campaignId: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { campaignId } = await ctx.params;

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        notificationDetail: true,
        trialDetail: true,
        promoDetail: true,
      },
    });
    if (!campaign) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    const [byType, series, history] = await Promise.all([
      prisma.campaignAnalyticsEvent.groupBy({
        by: ['type'],
        where: { campaignId, createdAt: { gte: fromDate, lte: toDate } },
        _count: { _all: true },
      }),
      prisma.campaignAnalyticsEvent.findMany({
        where: { campaignId, createdAt: { gte: fromDate, lte: toDate } },
        orderBy: { createdAt: 'asc' },
        take: 5000,
        select: { type: true, createdAt: true, placement: true },
      }),
      prisma.campaignStatusHistory.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      campaign,
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      byType,
      series,
      history,
    });
  } catch (e) {
    console.error('[admin/campaign-analytics/[campaignId]]', e);
    return NextResponse.json({ ok: false, error: 'Load failed' }, { status: 500 });
  }
}
