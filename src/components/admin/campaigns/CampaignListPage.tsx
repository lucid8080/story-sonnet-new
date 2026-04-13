'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type CampaignType = 'notification_bar' | 'trial_offer' | 'promo_code';

type Row = {
  id: string;
  internalName: string;
  status: string;
  type: string;
  priority: number;
  startsAt: string;
  endsAt: string;
  placements: { placement: string }[];
};

export function CampaignListPage({ type, title }: { type: CampaignType; title: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type, take: '100' });
      const res = await fetch(`/api/admin/campaigns?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Load failed');
      setRows(data.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  async function bulk(action: 'activate' | 'pause' | 'duplicate' | 'archive') {
    if (!selectedIds.length) {
      toast.message('Select at least one row');
      return;
    }
    try {
      const res = await fetch('/api/admin/campaigns/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk failed');
      toast.success(`Updated ${data.affected ?? 0}`);
      setSelected({});
      void load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk failed');
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-500">{loading ? 'Loading…' : `${rows.length} rows`}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => bulk('activate')}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Activate
          </button>
          <button
            type="button"
            onClick={() => bulk('pause')}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={() => bulk('duplicate')}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => bulk('archive')}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Archive
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  onChange={(e) => {
                    const on = e.target.checked;
                    const next: Record<string, boolean> = {};
                    for (const r of rows) next[r.id] = on;
                    setSelected(next);
                  }}
                />
              </th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Placements</th>
              <th className="px-3 py-2">Schedule</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[r.id])}
                    onChange={(e) => setSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-slate-900">{r.internalName}</td>
                <td className="px-3 py-2 text-slate-600">{r.status}</td>
                <td className="px-3 py-2 text-slate-600">{r.priority}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {r.placements.map((p) => p.placement).join(', ')}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {new Date(r.startsAt).toLocaleDateString()} – {new Date(r.endsAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/campaigns/${r.id}/edit`} className="font-semibold text-violet-600">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No campaigns yet.{' '}
                  <Link href={`/admin/campaigns/new?type=${type}`} className="text-violet-600">
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
