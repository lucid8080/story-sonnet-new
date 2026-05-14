import { Prisma, type CampaignSettings, type PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import { campaignSettingsPatchSchema } from '@/lib/validation/campaignSchemas';

let showPromoPricingColumnExistsCache: boolean | undefined;

/**
 * Whether `campaign_settings.show_promo_code_on_pricing` exists (cached per process).
 * Avoids failed Prisma calls that still log `prisma:error` when the column is missing.
 * After running migrations, restart the server so the cache can re-probe.
 */
export async function campaignSettingsShowPromoColumnExists(
  prisma: PrismaClient
): Promise<boolean> {
  if (showPromoPricingColumnExistsCache !== undefined) {
    return showPromoPricingColumnExistsCache;
  }
  const rows = await prisma.$queryRaw<{ one: number }[]>`
    SELECT 1 AS one
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'campaign_settings'
      AND column_name = 'show_promo_code_on_pricing'
    LIMIT 1
  `;
  showPromoPricingColumnExistsCache = rows.length > 0;
  return showPromoPricingColumnExistsCache;
}

/** For tests or after migrations in a long-lived process (optional). */
export function clearCampaignSettingsShowPromoColumnCache(): void {
  showPromoPricingColumnExistsCache = undefined;
}

/** Pre-migration DB: `show_promo_code_on_pricing` missing. Remove fallbacks once all envs are migrated. */
export function isMissingShowPromoCodeOnPricingColumnError(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (e.code !== 'P2022') return false;
  const blob = `${e.message} ${JSON.stringify(e.meta)}`.toLowerCase();
  return blob.includes('show_promo_code_on_pricing');
}

/** Client/schema mismatch: unknown arg or column until migrate + generate align. */
export function isShowPromoCodeOnPricingSchemaMismatchError(e: unknown): boolean {
  if (isMissingShowPromoCodeOnPricingColumnError(e)) return true;
  if (e instanceof Prisma.PrismaClientValidationError) {
    const msg = e.message.toLowerCase();
    return msg.includes('showpromocodeonpricing') || msg.includes('show_promo_code_on_pricing');
  }
  return false;
}

type LegacyCampaignSettingsSelect = Pick<
  CampaignSettings,
  | 'id'
  | 'defaultTimezone'
  | 'defaultCampaignPriority'
  | 'allowMultipleTopBars'
  | 'globalKillSwitch'
  | 'testModeEnabled'
  | 'testModeUserIdsJson'
  | 'previewHeaderName'
  | 'previewHeaderSecret'
  | 'defaultBarDismissPolicy'
  | 'promosCanStackWithTrials'
>;

async function fetchCampaignSettingsLegacySql(
  prisma: PrismaClient
): Promise<LegacyCampaignSettingsSelect | null> {
  const rows = await prisma.$queryRaw<LegacyCampaignSettingsSelect[]>`
    SELECT
      id,
      default_timezone AS "defaultTimezone",
      default_campaign_priority AS "defaultCampaignPriority",
      allow_multiple_top_bars AS "allowMultipleTopBars",
      global_kill_switch AS "globalKillSwitch",
      test_mode_enabled AS "testModeEnabled",
      test_mode_user_ids_json AS "testModeUserIdsJson",
      preview_header_name AS "previewHeaderName",
      preview_header_secret AS "previewHeaderSecret",
      default_bar_dismiss_policy::text AS "defaultBarDismissPolicy",
      promos_can_stack_with_trials AS "promosCanStackWithTrials"
    FROM campaign_settings
    WHERE id = 'default'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function ensureDefaultCampaignSettingsRowLegacy(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO campaign_settings (id)
    VALUES ('default')
    ON CONFLICT (id) DO NOTHING
  `;
}

function withPromoDefault(row: LegacyCampaignSettingsSelect): CampaignSettings {
  return { ...row, showPromoCodeOnPricing: true };
}

/**
 * Load or create the singleton `campaign_settings` row. When `show_promo_code_on_pricing` has not been
 * migrated yet, uses raw SQL so Prisma `upsert`/`findUnique` never touch the missing column (same as
 * admin pricing-banner compat).
 */
export async function getOrCreateCampaignSettings(prisma: PrismaClient): Promise<CampaignSettings> {
  if (!(await campaignSettingsShowPromoColumnExists(prisma))) {
    let legacy = await fetchCampaignSettingsLegacySql(prisma);
    if (!legacy) {
      await ensureDefaultCampaignSettingsRowLegacy(prisma);
      legacy = await fetchCampaignSettingsLegacySql(prisma);
    }
    if (!legacy) throw new Error('campaign_settings row missing');
    return withPromoDefault(legacy);
  }
  return prisma.campaignSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  });
}

/**
 * Admin API: full row including `showPromoCodeOnPricing` (compat `true` when column absent).
 */
export async function getCampaignSettingsForAdminApi(prisma: PrismaClient): Promise<CampaignSettings> {
  return getOrCreateCampaignSettings(prisma);
}

/** Non-archived promo campaigns in their start/end window (same shape as public validation candidates). */
export async function hasSchedulablePromoCodeCampaign(prisma: PrismaClient): Promise<boolean> {
  const now = new Date();
  const n = await prisma.campaign.count({
    where: {
      type: 'promo_code',
      archivedAt: null,
      status: { in: ['active', 'scheduled'] },
      startsAt: { lte: now },
      endsAt: { gte: now },
      promoDetail: { isNot: null },
    },
  });
  return n > 0;
}

/**
 * Whether the public pricing page should render the promo-code field. Requires both the admin toggle
 * (`show_promo_code_on_pricing`) and at least one schedulable promo campaign; deleting all promos hides
 * the box even if the toggle stays on.
 */
export async function getPricingPromoBannerEnabled(prisma: PrismaClient): Promise<boolean> {
  let settingOn = true;
  if (await campaignSettingsShowPromoColumnExists(prisma)) {
    try {
      const row = await prisma.campaignSettings.findUnique({ where: { id: 'default' } });
      if (row) {
        settingOn = row.showPromoCodeOnPricing;
      } else {
        const created = await getOrCreateCampaignSettings(prisma);
        settingOn = created.showPromoCodeOnPricing;
      }
    } catch (e) {
      if (isMissingShowPromoCodeOnPricingColumnError(e)) {
        settingOn = true;
      } else {
        throw e;
      }
    }
  }

  if (!settingOn) return false;
  if (!process.env.DATABASE_URL) return false;
  return hasSchedulablePromoCodeCampaign(prisma);
}

export type CampaignSettingsParsedPatch = z.infer<typeof campaignSettingsPatchSchema>;

/**
 * DB without `show_promo_code_on_pricing`: persist other fields only. Response still includes
 * `showPromoCodeOnPricing: true` (compat).
 */
export async function applyCampaignSettingsPatchLegacySql(
  prisma: PrismaClient,
  patch: CampaignSettingsParsedPatch
): Promise<CampaignSettings> {
  let current = await fetchCampaignSettingsLegacySql(prisma);
  if (!current) {
    await ensureDefaultCampaignSettingsRowLegacy(prisma);
    current = await fetchCampaignSettingsLegacySql(prisma);
  }
  if (!current) throw new Error('campaign_settings row missing');

  const testModeUserIdsJson: Prisma.InputJsonValue =
    patch.testModeUserIds !== undefined
      ? (patch.testModeUserIds as Prisma.InputJsonValue)
      : (current.testModeUserIdsJson as Prisma.InputJsonValue);

  const merged = {
    defaultTimezone: patch.defaultTimezone ?? current.defaultTimezone,
    defaultCampaignPriority: patch.defaultCampaignPriority ?? current.defaultCampaignPriority,
    allowMultipleTopBars: patch.allowMultipleTopBars ?? current.allowMultipleTopBars,
    globalKillSwitch: patch.globalKillSwitch ?? current.globalKillSwitch,
    testModeEnabled: patch.testModeEnabled ?? current.testModeEnabled,
    testModeUserIdsJson,
    previewHeaderName: patch.previewHeaderName ?? current.previewHeaderName,
    previewHeaderSecret:
      patch.previewHeaderSecret !== undefined ? patch.previewHeaderSecret : current.previewHeaderSecret,
    defaultBarDismissPolicy:
      patch.defaultBarDismissPolicy ?? current.defaultBarDismissPolicy,
    promosCanStackWithTrials:
      patch.promosCanStackWithTrials ?? current.promosCanStackWithTrials,
  };

  // Prisma raw binding treats JS arrays as list params, not jsonb — serialize for PostgreSQL.
  const testModeUserIdsForJsonb = JSON.stringify(merged.testModeUserIdsJson ?? []);

  await prisma.$executeRaw`
    UPDATE campaign_settings SET
      default_timezone = ${merged.defaultTimezone},
      default_campaign_priority = ${merged.defaultCampaignPriority},
      allow_multiple_top_bars = ${merged.allowMultipleTopBars},
      global_kill_switch = ${merged.globalKillSwitch},
      test_mode_enabled = ${merged.testModeEnabled},
      test_mode_user_ids_json = ${testModeUserIdsForJsonb}::jsonb,
      preview_header_name = ${merged.previewHeaderName},
      preview_header_secret = ${merged.previewHeaderSecret},
      default_bar_dismiss_policy = CAST(${merged.defaultBarDismissPolicy} AS "NotificationDismissPolicy"),
      promos_can_stack_with_trials = ${merged.promosCanStackWithTrials}
    WHERE id = 'default'
  `;

  return withPromoDefault({
    id: 'default',
    defaultTimezone: merged.defaultTimezone,
    defaultCampaignPriority: merged.defaultCampaignPriority,
    allowMultipleTopBars: merged.allowMultipleTopBars,
    globalKillSwitch: merged.globalKillSwitch,
    testModeEnabled: merged.testModeEnabled,
    testModeUserIdsJson: merged.testModeUserIdsJson as CampaignSettings['testModeUserIdsJson'],
    previewHeaderName: merged.previewHeaderName,
    previewHeaderSecret: merged.previewHeaderSecret,
    defaultBarDismissPolicy: merged.defaultBarDismissPolicy,
    promosCanStackWithTrials: merged.promosCanStackWithTrials,
  });
}

export type CampaignSettingsPatchData = {
  defaultTimezone?: string;
  defaultCampaignPriority?: number;
  allowMultipleTopBars?: boolean;
  globalKillSwitch?: boolean;
  testModeEnabled?: boolean;
  testModeUserIdsJson?: Prisma.InputJsonValue;
  previewHeaderName?: string;
  previewHeaderSecret?: string | null;
  defaultBarDismissPolicy?: CampaignSettings['defaultBarDismissPolicy'];
  promosCanStackWithTrials?: boolean;
  showPromoCodeOnPricing?: boolean;
};

export function buildCampaignSettingsPatch(
  d: CampaignSettingsPatchData
): Prisma.CampaignSettingsUpdateInput {
  return {
    ...(d.defaultTimezone !== undefined ? { defaultTimezone: d.defaultTimezone } : {}),
    ...(d.defaultCampaignPriority !== undefined
      ? { defaultCampaignPriority: d.defaultCampaignPriority }
      : {}),
    ...(d.allowMultipleTopBars !== undefined ? { allowMultipleTopBars: d.allowMultipleTopBars } : {}),
    ...(d.globalKillSwitch !== undefined ? { globalKillSwitch: d.globalKillSwitch } : {}),
    ...(d.testModeEnabled !== undefined ? { testModeEnabled: d.testModeEnabled } : {}),
    ...(d.testModeUserIdsJson !== undefined ? { testModeUserIdsJson: d.testModeUserIdsJson } : {}),
    ...(d.previewHeaderName !== undefined ? { previewHeaderName: d.previewHeaderName } : {}),
    ...(d.previewHeaderSecret !== undefined ? { previewHeaderSecret: d.previewHeaderSecret } : {}),
    ...(d.defaultBarDismissPolicy !== undefined
      ? { defaultBarDismissPolicy: d.defaultBarDismissPolicy }
      : {}),
    ...(d.promosCanStackWithTrials !== undefined
      ? { promosCanStackWithTrials: d.promosCanStackWithTrials }
      : {}),
    ...(d.showPromoCodeOnPricing !== undefined
      ? { showPromoCodeOnPricing: d.showPromoCodeOnPricing }
      : {}),
  };
}

export function parseTestUserIds(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === 'string' && x.length > 0);
}
