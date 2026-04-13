import type { CampaignPlacementKey, CampaignStatus, CampaignType, PrismaClient } from '@prisma/client';
import { matchesAudience, parseTrialEligibility, trialOfferVisibleForSignupWindow } from './audience';
import { isPayingSubscriber } from './context';
import { toPublicPayload } from './dto';
import { trialOfferDefaultCtaHref } from './trialCta';
import { isWithinSchedule, statusAllowsRender } from './schedule';
import { getOrCreateCampaignSettings, parseTestUserIds } from './settings';
import type {
  CampaignWithRelations,
  ResolveOptions,
  ResolvedCampaignPayload,
} from './types';

export type ConflictSortable = {
  priority: number;
  pinnedHighest: boolean;
  publishedAt: Date | null;
  createdAt: Date;
};

/** Higher score wins first in sorted descending array (first element = winner). */
export function sortKeyForCampaign(c: ConflictSortable): number {
  return (c.pinnedHighest ? 1_000_000_000 : 0) + c.priority;
}

export function sortCampaignsByConflictRules<T extends ConflictSortable>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const dk = sortKeyForCampaign(b) - sortKeyForCampaign(a);
    if (dk !== 0) return dk;
    const pa = a.publishedAt?.getTime() ?? a.createdAt.getTime();
    const pb = b.publishedAt?.getTime() ?? b.createdAt.getTime();
    return pb - pa;
  });
}

function testModeBlocks(
  settings: { testModeEnabled: boolean; testModeUserIdsJson: unknown },
  userId: string | undefined,
  previewMode: boolean
): boolean {
  if (previewMode) return false;
  if (!settings.testModeEnabled) return false;
  const ids = parseTestUserIds(settings.testModeUserIdsJson);
  if (ids.length === 0) return true;
  return !userId || !ids.includes(userId);
}

function statusMatches(
  status: CampaignStatus,
  opts: { previewMode: boolean }
): boolean {
  if (opts.previewMode && status === 'draft') return true;
  return statusAllowsRender(status);
}

function scheduleMatches(
  status: CampaignStatus,
  startsAt: Date,
  endsAt: Date,
  now: Date,
  previewMode: boolean
): boolean {
  if (previewMode && status === 'draft') return true;
  return isWithinSchedule(startsAt, endsAt, now);
}

export async function fetchCampaignCandidates(
  prisma: PrismaClient,
  params: {
    placement: CampaignPlacementKey;
    now: Date;
    previewMode: boolean;
    types?: CampaignType[];
  }
): Promise<CampaignWithRelations[]> {
  const { placement, now, previewMode, types } = params;

  const scheduleWindow = {
    startsAt: { lte: now },
    endsAt: { gte: now },
  };

  return prisma.campaign.findMany({
    where: {
      archivedAt: null,
      ...(types?.length ? { type: { in: types } } : {}),
      placements: { some: { placement } },
      AND: [
        previewMode
          ? {
              OR: [{ status: 'draft' }, { status: { in: ['active', 'scheduled'] }, ...scheduleWindow }],
            }
          : {
              status: { in: ['active', 'scheduled'] },
              ...scheduleWindow,
            },
      ],
    },
    include: {
      placements: true,
      notificationDetail: true,
      trialDetail: true,
      promoDetail: true,
    },
  }) as Promise<CampaignWithRelations[]>;
}

export function filterCampaignsForViewer(
  rows: CampaignWithRelations[],
  opts: ResolveOptions
): CampaignWithRelations[] {
  const { now, user, previewMode } = opts;

  return rows.filter((c) => {
    if (!statusMatches(c.status, { previewMode })) return false;
    if (!scheduleMatches(c.status, c.startsAt, c.endsAt, now, previewMode)) return false;
    if (c.type === 'notification_bar' && c.notificationDetail) {
      return matchesAudience(c.notificationDetail.audience, user);
    }
    if (c.type === 'trial_offer' && c.trialDetail) {
      const rules = parseTrialEligibility(c.trialDetail.eligibilityJson);
      if (rules.loggedOutOnly && user.isLoggedIn) return false;
      if (rules.excludeActiveSubscribers && isPayingSubscriber(user.subscriptionStatus)) {
        return false;
      }
      return trialOfferVisibleForSignupWindow(rules, user, now);
    }
    if (c.type === 'promo_code' && c.promoDetail) {
      if (c.promoDetail.loggedInOnly && !user.isLoggedIn) return false;
      return true;
    }
    return true;
  });
}

export async function resolveCampaignPayloads(
  prisma: PrismaClient,
  opts: ResolveOptions & { types?: CampaignType[] }
): Promise<ResolvedCampaignPayload[]> {
  const settings = opts.settings ?? (await getOrCreateCampaignSettings(prisma));

  if (settings.globalKillSwitch) {
    return [];
  }

  if (testModeBlocks(settings, opts.user.userId, opts.previewMode)) {
    return [];
  }

  const rows = await fetchCampaignCandidates(prisma, {
    placement: opts.placement,
    now: opts.now,
    previewMode: opts.previewMode,
    types: opts.types,
  });

  const filtered = filterCampaignsForViewer(rows, opts);
  const sorted = sortCampaignsByConflictRules(filtered);

  const payloads: ResolvedCampaignPayload[] = [];
  for (const c of sorted) {
    const p = toPublicPayload(c);
    if (!p) continue;
    if (p.kind === 'trial_offer') {
      payloads.push({
        ...p,
        ctaHref: trialOfferDefaultCtaHref(p.landingSlug, opts.user, p.campaignId),
      });
    } else {
      payloads.push(p);
    }
  }

  if (opts.placement === 'global_top_bar' && !settings.allowMultipleTopBars) {
    return payloads.slice(0, 1);
  }

  return payloads;
}

export async function resolveFirstCampaignPayload(
  prisma: PrismaClient,
  opts: ResolveOptions & { types?: CampaignType[] }
): Promise<ResolvedCampaignPayload | null> {
  const list = await resolveCampaignPayloads(prisma, opts);
  return list[0] ?? null;
}
