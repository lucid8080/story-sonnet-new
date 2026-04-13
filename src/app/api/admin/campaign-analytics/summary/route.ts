import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ ok: false, error: 'Invalid date range' }, { status: 400 });
  }

  try {
    const [active, scheduled, expired, byType, topCampaigns] = await Promise.all([
      prisma.campaign.count({
        where: {
          archivedAt: null,
          status: 'active',
          startsAt: { lte: toDate },
          endsAt: { gte: fromDate },
        },
      }),
      prisma.campaign.count({
        where: { archivedAt: null, status: 'scheduled' },
      }),
      prisma.campaign.count({
        where: { archivedAt: null, status: 'expired' },
      }),
      prisma.campaignAnalyticsEvent.groupBy({
        by: ['type'],
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _count: { _all: true },
      }),
      prisma.campaignAnalyticsEvent.groupBy({
        by: ['campaignId'],
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _count: { _all: true },
        orderBy: { _count: { campaignId: 'desc' } },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      counts: { active, scheduled, expired },
      eventsByType: byType,
      topCampaigns,
    });
  } catch (e) {
    console.error('[admin/campaign-analytics/summary]', e);
    return NextResponse.json({ ok: false, error: 'Summary failed' }, { status: 500 });
  }
}
