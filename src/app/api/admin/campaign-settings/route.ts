import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { campaignSettingsPatchSchema } from '@/lib/validation/campaignSchemas';
import prisma from '@/lib/prisma';
import {
  applyCampaignSettingsPatchLegacySql,
  buildCampaignSettingsPatch,
  campaignSettingsShowPromoColumnExists,
  getCampaignSettingsForAdminApi,
  isMissingShowPromoCodeOnPricingColumnError,
  isShowPromoCodeOnPricingSchemaMismatchError,
} from '@/lib/campaigns/settings';

/**
 * TODO: After `show_promo_code_on_pricing` is migrated everywhere, remove legacy fallbacks
 * (raw SQL + Prisma retry branches) and use a single prisma.campaignSettings read/write path.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const row = await getCampaignSettingsForAdminApi(prisma);
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
  const patchInput: Parameters<typeof buildCampaignSettingsPatch>[0] = {
    defaultTimezone: d.defaultTimezone,
    defaultCampaignPriority: d.defaultCampaignPriority,
    allowMultipleTopBars: d.allowMultipleTopBars,
    globalKillSwitch: d.globalKillSwitch,
    testModeEnabled: d.testModeEnabled,
    testModeUserIdsJson:
      d.testModeUserIds !== undefined
        ? (d.testModeUserIds as unknown as Prisma.InputJsonValue)
        : undefined,
    previewHeaderName: d.previewHeaderName,
    previewHeaderSecret: d.previewHeaderSecret,
    defaultBarDismissPolicy: d.defaultBarDismissPolicy,
    promosCanStackWithTrials: d.promosCanStackWithTrials,
    showPromoCodeOnPricing: d.showPromoCodeOnPricing,
  };

  if (!(await campaignSettingsShowPromoColumnExists(prisma))) {
    try {
      const row = await applyCampaignSettingsPatchLegacySql(prisma, d);
      return NextResponse.json({ ok: true, settings: row });
    } catch (e) {
      console.error('[admin/campaign-settings PATCH legacy sql]', e);
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : 'Update failed' },
        { status: 500 }
      );
    }
  }

  try {
    const row = await prisma.campaignSettings.update({
      where: { id: 'default' },
      data: buildCampaignSettingsPatch(patchInput),
    });
    return NextResponse.json({ ok: true, settings: row });
  } catch (e) {
    if (!isShowPromoCodeOnPricingSchemaMismatchError(e)) {
      console.error('[admin/campaign-settings PATCH]', e);
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : 'Update failed' },
        { status: 500 }
      );
    }

    try {
      const row = await prisma.campaignSettings.update({
        where: { id: 'default' },
        data: buildCampaignSettingsPatch({
          ...patchInput,
          showPromoCodeOnPricing: undefined,
        }),
      });
      return NextResponse.json({ ok: true, settings: row });
    } catch (e2) {
      if (isMissingShowPromoCodeOnPricingColumnError(e2)) {
        try {
          const row = await applyCampaignSettingsPatchLegacySql(prisma, d);
          return NextResponse.json({ ok: true, settings: row });
        } catch (e3) {
          console.error('[admin/campaign-settings PATCH legacy sql]', e3);
          return NextResponse.json(
            { ok: false, error: e3 instanceof Error ? e3.message : 'Update failed' },
            { status: 500 }
          );
        }
      }
      console.error('[admin/campaign-settings PATCH]', e2);
      return NextResponse.json(
        { ok: false, error: e2 instanceof Error ? e2.message : 'Update failed' },
        { status: 500 }
      );
    }
  }
}
