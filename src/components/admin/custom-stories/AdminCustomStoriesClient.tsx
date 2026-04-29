'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type OrderRow = {
  id: string;
  packageType: string;
  episodeCount: number;
  status: string;
  priceCents: number;
  inputs: unknown;
  nfcRequested: boolean;
  nfcFulfilledAt: string | null;
  createdAt: string;
  user: { id: string; email: string | null; name: string | null };
  story: { id: string; slug: string; title: string } | null;
};

export function AdminCustomStoriesClient() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/custom-stories');
    const json = await res.json();
    if (res.ok && json.ok) setRows(json.orders);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleNfcFulfilled(id: string) {
    await fetch(`/api/admin/custom-stories/${encodeURIComponent(id)}/nfc-fulfilled`, {
      method: 'POST',
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Custom story orders</h1>
        <p className="mt-1 text-sm text-slate-500">Track payment, generation, inputs JSON, and NFC fulfillment.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="p-3">Order</th>
              <th className="p-3">User</th>
              <th className="p-3">Package</th>
              <th className="p-3">Status</th>
              <th className="p-3">Story</th>
              <th className="p-3">Inputs</th>
              <th className="p-3">NFC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-slate-500" colSpan={7}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-4 text-slate-500" colSpan={7}>
                  No custom story orders yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-top">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{row.id}</div>
                    <div className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">${(row.priceCents / 100).toFixed(2)}</div>
                  </td>
                  <td className="p-3 text-slate-700">{row.user.email ?? row.user.name ?? row.user.id}</td>
                  <td className="p-3 text-slate-700">
                    {row.packageType} ({row.episodeCount} ep)
                  </td>
                  <td className="p-3 text-slate-700">{row.status}</td>
                  <td className="p-3 text-slate-700">
                    {row.story ? (
                      <Link className="font-semibold text-violet-600 hover:text-violet-800" href={`/story/${row.story.slug}`}>
                        {row.story.title}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3">
                    <pre className="max-h-40 max-w-xs overflow-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                      {JSON.stringify(row.inputs, null, 2)}
                    </pre>
                  </td>
                  <td className="p-3">
                    <div className="space-y-2">
                      <div className="text-xs text-slate-600">
                        Requested: <span className="font-semibold">{row.nfcRequested ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Fulfilled: <span className="font-semibold">{row.nfcFulfilledAt ? 'Yes' : 'No'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleNfcFulfilled(row.id)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
                      >
                        {row.nfcFulfilledAt ? 'Mark unfulfilled' : 'Mark fulfilled'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
