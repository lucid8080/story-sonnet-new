import prisma from '@/lib/prisma';
import { getOrCreateCampaignSettings } from '@/lib/campaigns/settings';
import { resolveFirstCampaignPayload } from '@/lib/campaigns/resolve';
import type { CampaignUserContext } from '@/lib/campaigns/types';
import Link from 'next/link';
import { CampaignPauseAllButton } from '@/components/admin/campaigns/CampaignPauseAllButton';

const visitorAll: CampaignUserContext = {
  isLoggedIn: false,
  subscriptionStatus: 'free',
  subscriptionPlan: null,
  profileCreatedAt: null,
  hadPaidPurchase: false,
  lifetimeSpendCents: 0,
};

export default async function CampaignsOverviewPage() {
  let active = 0;
  let scheduled = 0;
  let expired = 0;
  let liveBar: Awaited<ReturnType<typeof resolveFirstCampaignPayload>> = null;

  if (process.env.DATABASE_URL) {
    try {
      const [a, s, e, settings] = await Promise.all([
        prisma.campaign.count({
          where: {
            archivedAt: null,
            status: 'active',
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
        }),
        prisma.campaign.count({ where: { archivedAt: null, status: 'scheduled' } }),
        prisma.campaign.count({ where: { archivedAt: null, status: 'expired' } }),
        getOrCreateCampaignSettings(prisma),
      ]);
      active = a;
      scheduled = s;
      expired = e;
      liveBar = await resolveFirstCampaignPayload(prisma, {
        now: new Date(),
        placement: 'global_top_bar',
        pathname: '/',
        user: visitorAll,
        settings,
        previewMode: false,
        types: ['notification_bar', 'trial_offer'],
      });
    } catch (err) {
      console.warn('[admin/campaigns overview]', err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Active (in window)" value={active} />
        <Stat label="Scheduled" value={scheduled} />
        <Stat label="Expired" value={expired} />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          What is live? (global top bar, visitor view)
        </h2>
        {liveBar && liveBar.kind === 'notification_bar' ? (
          <div className="mt-3 rounded-xl bg-violet-600 px-4 py-3 text-sm text-white">
            <div className="font-semibold">{liveBar.messagePrimary}</div>
            {liveBar.messageSecondary ? (
              <div className="mt-1 text-violet-100">{liveBar.messageSecondary}</div>
            ) : null}
          </div>
        ) : liveBar && liveBar.kind === 'trial_offer' ? (
          <div className="mt-3 rounded-xl bg-emerald-700 px-4 py-3 text-sm text-white">
            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-200">Free trial</div>
            <div className="font-semibold">{liveBar.headline}</div>
            {liveBar.subheadline ? (
              <div className="mt-1 text-emerald-100">{liveBar.subheadline}</div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No active global top bar (notification or trial) for anonymous visitors.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Quick href="/admin/campaigns/new?type=notification_bar" label="New notification bar" />
        <Quick href="/admin/campaigns/new?type=trial_offer" label="New free trial" />
        <Quick href="/admin/campaigns/new?type=promo_code" label="New promo code" />
        <CampaignPauseAllButton />
      </div>

      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
        Use tabs above for full lists, placement matrix, analytics, and global settings (kill switch, test
        mode).
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-slate-200 hover:ring-violet-200"
    >
      {label}
    </Link>
  );
}
