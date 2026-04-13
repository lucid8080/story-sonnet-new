import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { duplicateCampaign } from '@/lib/admin/campaigns/duplicateCampaign';
import prisma from '@/lib/prisma';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const adminId = gate.session.user!.id;

  try {
    const created = await duplicateCampaign(prisma, id, adminId);
    if (!created) {
      return NextResponse.json({ ok: false, error: 'Could not duplicate campaign' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error('[admin/campaigns duplicate]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Duplicate failed' },
      { status: 500 }
    );
  }
}
