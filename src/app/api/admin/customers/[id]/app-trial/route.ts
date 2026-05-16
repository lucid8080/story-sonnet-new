import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  getCustomerAppTrialSummary,
  grantAppTrialForUser,
} from '@/lib/admin/customers/grantAppTrial';
import { customerGrantAppTrialBodySchema } from '@/lib/validation/customerSchemas';

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
      include: { profile: { select: { subscriptionStatus: true } } },
    });
    if (!user?.profile) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    const summary = await getCustomerAppTrialSummary(
      prisma,
      id,
      user.profile.subscriptionStatus
    );

    return NextResponse.json({ ok: true, data: summary });
  } catch (e) {
    console.error('[GET /api/admin/customers/[id]/app-trial]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function POST(
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

  const parsed = customerGrantAppTrialBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await grantAppTrialForUser(prisma, {
      userId: id,
      campaignId: parsed.data.campaignId,
      adminId,
      reason: parsed.data.reason,
      durationDays: parsed.data.durationDays,
    });

    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'invalid_campaign' || result.code === 'invalid_duration'
            ? 400
            : 400;
      return NextResponse.json(
        { ok: false, error: result.message, code: result.code },
        { status }
      );
    }

    const summary = await getCustomerAppTrialSummary(prisma, id, null);

    return NextResponse.json({
      ok: true,
      data: { grant: result, summary },
    });
  } catch (e) {
    console.error('[POST /api/admin/customers/[id]/app-trial]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
