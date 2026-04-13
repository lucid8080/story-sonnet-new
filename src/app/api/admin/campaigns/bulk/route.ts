import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { duplicateCampaign } from '@/lib/admin/campaigns/duplicateCampaign';
import { recordCampaignStatusChange } from '@/lib/admin/campaigns/statusHistory';
import { campaignBulkBodySchema } from '@/lib/validation/campaignSchemas';
import prisma from '@/lib/prisma';

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

  const parsed = campaignBulkBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const action = parsed.data;

  try {
    if (action.action === 'pause_all') {
      const rows = await prisma.campaign.findMany({
        where: { status: { in: ['active', 'scheduled'] }, archivedAt: null },
        select: { id: true, status: true },
      });
      for (const r of rows) {
        await prisma.$transaction(async (tx) => {
          await tx.campaign.update({
            where: { id: r.id },
            data: { status: 'paused' },
          });
          await recordCampaignStatusChange(tx, {
            campaignId: r.id,
            fromStatus: r.status,
            toStatus: 'paused',
            actorUserId: adminId,
          });
        });
      }
      return NextResponse.json({ ok: true, affected: rows.length });
    }

    const ids = action.ids;
    let affected = 0;
    const createdIds: string[] = [];

    if (action.action === 'activate') {
      for (const id of ids) {
        const cur = await prisma.campaign.findUnique({ where: { id } });
        if (!cur || cur.archivedAt) continue;
        await prisma.$transaction(async (tx) => {
          await tx.campaign.update({
            where: { id },
            data: {
              status: 'active',
              publishedAt: cur.publishedAt ?? new Date(),
            },
          });
          await recordCampaignStatusChange(tx, {
            campaignId: id,
            fromStatus: cur.status,
            toStatus: 'active',
            actorUserId: adminId,
          });
        });
        affected += 1;
      }
    } else if (action.action === 'pause') {
      for (const id of ids) {
        const cur = await prisma.campaign.findUnique({ where: { id } });
        if (!cur || cur.archivedAt) continue;
        await prisma.$transaction(async (tx) => {
          await tx.campaign.update({ where: { id }, data: { status: 'paused' } });
          await recordCampaignStatusChange(tx, {
            campaignId: id,
            fromStatus: cur.status,
            toStatus: 'paused',
            actorUserId: adminId,
          });
        });
        affected += 1;
      }
    } else if (action.action === 'archive') {
      for (const id of ids) {
        const cur = await prisma.campaign.findUnique({ where: { id } });
        if (!cur) continue;
        await prisma.campaign.update({
          where: { id },
          data: { archivedAt: new Date(), status: 'paused' },
        });
        affected += 1;
      }
    } else if (action.action === 'duplicate') {
      for (const id of ids) {
        const row = await duplicateCampaign(prisma, id, adminId);
        if (row) {
          affected += 1;
          createdIds.push(row.id);
        }
      }
    }

    return NextResponse.json({ ok: true, affected, createdIds });
  } catch (e) {
    console.error('[admin/campaigns/bulk]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Bulk failed' },
      { status: 500 }
    );
  }
}
