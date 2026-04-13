import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { campaignSettingsPatchSchema } from '@/lib/validation/campaignSchemas';
import prisma from '@/lib/prisma';
import { getOrCreateCampaignSettings } from '@/lib/campaigns/settings';

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const row = await getOrCreateCampaignSettings(prisma);
    return NextResponse.json({ ok: true, settings: row });
  } catch (e) {
    console.error('[admin/campaign-settings GET]', e);
    return NextResponse.json({ ok: false, error: 'Load failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = campaignSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;

  try {
    const row = await prisma.campaignSettings.update({
      where: { id: 'default' },
      data: {
        ...(d.defaultTimezone !== undefined ? { defaultTimezone: d.defaultTimezone } : {}),
        ...(d.defaultCampaignPriority !== undefined
          ? { defaultCampaignPriority: d.defaultCampaignPriority }
          : {}),
        ...(d.allowMultipleTopBars !== undefined ? { allowMultipleTopBars: d.allowMultipleTopBars } : {}),
        ...(d.globalKillSwitch !== undefined ? { globalKillSwitch: d.globalKillSwitch } : {}),
        ...(d.testModeEnabled !== undefined ? { testModeEnabled: d.testModeEnabled } : {}),
        ...(d.testModeUserIds !== undefined
          ? { testModeUserIdsJson: d.testModeUserIds as unknown as object }
          : {}),
        ...(d.previewHeaderName !== undefined ? { previewHeaderName: d.previewHeaderName } : {}),
        ...(d.previewHeaderSecret !== undefined ? { previewHeaderSecret: d.previewHeaderSecret } : {}),
        ...(d.defaultBarDismissPolicy !== undefined
          ? { defaultBarDismissPolicy: d.defaultBarDismissPolicy }
          : {}),
        ...(d.promosCanStackWithTrials !== undefined
          ? { promosCanStackWithTrials: d.promosCanStackWithTrials }
          : {}),
      },
    });
    return NextResponse.json({ ok: true, settings: row });
  } catch (e) {
    console.error('[admin/campaign-settings PATCH]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 }
    );
  }
}
