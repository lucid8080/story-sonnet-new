'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CampaignAnalyticsPage() {
  const [data, setData] = useState<{
    counts?: { active: number; scheduled: number; expired: number };
    eventsByType?: { type: string; _count: { _all: number } }[];
    topCampaigns?: { campaignId: string; _count: { _all: number } }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/campaign-analytics/summary');
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Failed');
        setData(j);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Active" value={data?.counts?.active ?? '—'} />
        <Stat label="Scheduled" value={data?.counts?.scheduled ?? '—'} />
        <Stat label="Expired" value={data?.counts?.expired ?? '—'} />
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-sm font-bold text-slate-800">Events by type (last 30d)</h2>
        <ul className="mt-2 text-sm text-slate-600">
          {(data?.eventsByType ?? []).map((r) => (
            <li key={r.type}>
              {r.type}: <strong>{r._count._all}</strong>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-sm font-bold text-slate-800">Top campaigns by events</h2>
        <ul className="mt-2 text-sm">
          {(data?.topCampaigns ?? []).map((r) => (
            <li key={r.campaignId} className="flex justify-between gap-2 border-b border-slate-50 py-1">
              <Link href={`/admin/campaigns/analytics/${r.campaignId}`} className="text-violet-700">
                {r.campaignId.slice(0, 8)}…
              </Link>
              <span>{r._count._all}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}
