'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { StatCard } from './StatCard';
import { AccountStatusBadge, PlanBadge } from './badges';
import { ConfirmDialog } from './ConfirmDialog';

type ListItem = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  accountStatus: string;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  creditBalance: number;
  lifetimeSpendCents: number;
  totalOrders: number;
  usageCount: number;
  lastActiveAt: string | null;
  createdAt: string;
  isFlagged: boolean;
  isVip: boolean;
};

type Stats = {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisWeek: number;
  payingCustomers: number;
  premiumCustomers: number;
  customersWithCredits: number;
  recentActivityCustomers: number;
  flaggedCustomers: number;
};

const defaults: Record<string, string> = {
  page: '1',
  pageSize: '25',
  q: '',
  accountStatus: 'all',
  role: '',
  plan: 'all',
  joined: 'all',
  activity: 'all',
  flagged: 'all',
  sort: 'created_desc',
};

function buildQueryString(
  params: URLSearchParams,
  patch: Record<string, string>
) {
  const next = new URLSearchParams(params.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === '' || v === defaults[k as keyof typeof defaults]) {
      next.delete(k);
    } else {
      next.set(k, v);
    }
  }
  return next.toString();
}

export function CustomersAdminClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('suspend');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [bulkAmount, setBulkAmount] = useState('100');
  const [bulkTemplate, setBulkTemplate] = useState('');

  const qs = searchParams.toString();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?${qs}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Failed to load');
      }
      setStats(json.data.stats);
      setItems(json.data.items);
      setTotal(json.data.total);
      setPage(json.data.page);
      setPageSize(json.data.pageSize);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const allOnPageSelected = useMemo(() => {
    if (!items.length) return false;
    return items.every((i) => selected.has(i.id));
  }, [items, selected]);

  function toggleAllPage() {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function patchUrl(patch: Record<string, string>) {
    const s = buildQueryString(searchParams, patch);
    router.push(s ? `${pathname}?${s}` : pathname);
  }

  async function runBulk() {
    if (selected.size === 0) {
      toast.error('Select at least one customer');
      return;
    }
    if (bulkReason.trim().length < 3) {
      toast.error('Reason must be at least 3 characters');
      return;
    }
    const userIds = Array.from(selected);
    let body: object = { reason: bulkReason };

    if (bulkAction === 'add_tag' || bulkAction === 'remove_tag') {
      if (!bulkTag.trim()) {
        toast.error('Tag required');
        return;
      }
      body = {
        action: bulkAction,
        userIds,
        tag: bulkTag.trim(),
        reason: bulkReason,
      };
    } else if (bulkAction === 'grant_credits') {
      const amount = Number(bulkAmount);
      if (!Number.isFinite(amount) || amount < 1) {
        toast.error('Invalid credit amount');
        return;
      }
      body = {
        action: 'grant_credits',
        userIds,
        amount,
        reason: bulkReason,
      };
    } else if (bulkAction === 'add_note_template') {
      if (!bulkTemplate.trim()) {
        toast.error('Note text required');
        return;
      }
      body = {
        action: 'add_note_template',
        userIds,
        template: bulkTemplate,
        reason: bulkReason,
      };
    } else {
      body = {
        action: bulkAction,
        userIds,
        reason: bulkReason,
      };
    }

    try {
      const res = await fetch('/api/admin/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Bulk failed');
      }
      toast.success(`Updated ${json.data.affected} customer(s)`);
      setBulkOpen(false);
      setBulkReason('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk failed');
    }
  }

  function exportCsv() {
    const exportQs = qs ? `${qs}&` : '';
    window.open(`/api/admin/customers/export?${exportQs}`, '_blank');
  }

  function exportSelectedCsv() {
    if (selected.size === 0) {
      toast.error('Select rows to export');
      return;
    }
    const ids = Array.from(selected).join(',');
    window.open(
      `/api/admin/customers/export?ids=${encodeURIComponent(ids)}`,
      '_blank'
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search, segment, and manage accounts. Saved filter views (DB) —{' '}
          <span className="text-slate-400">TODO</span>.
        </p>
      </div>

      {stats && !loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total customers" value={stats.totalCustomers} />
          <StatCard label="Active accounts" value={stats.activeCustomers} />
          <StatCard label="New (7d)" value={stats.newCustomersThisWeek} />
          <StatCard label="Paying" value={stats.payingCustomers} />
          <StatCard label="Premium / VIP+" value={stats.premiumCustomers} />
          <StatCard label="With credits" value={stats.customersWithCredits} />
          <StatCard label="Recent activity (7d)" value={stats.recentActivityCustomers} />
          <StatCard label="Flagged" value={stats.flaggedCustomers} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-100"
            />
          ))}
        </div>
      )}

      <div className="sticky top-0 z-10 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
            Search
            <input
              key={`q-${searchParams.get('q') ?? ''}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Name, email, or user id"
              defaultValue={searchParams.get('q') ?? ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  patchUrl({ q: (e.target as HTMLInputElement).value });
                }
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Account
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={searchParams.get('accountStatus') ?? 'all'}
              onChange={(e) => patchUrl({ accountStatus: e.target.value, page: '1' })}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
              <option value="pending">Pending</option>
              <option value="deleted">Deleted</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Plan
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={searchParams.get('plan') ?? 'all'}
              onChange={(e) => patchUrl({ plan: e.target.value, page: '1' })}
            >
              <option value="all">All</option>
              <option value="free">Free / canceled</option>
              <option value="paying">Paying (active/trialing)</option>
              <option value="past_due">Past due</option>
              <option value="premium_profile">Premium profile</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Joined
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={searchParams.get('joined') ?? 'all'}
              onChange={(e) => patchUrl({ joined: e.target.value, page: '1' })}
            >
              <option value="all">Any</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Activity
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={searchParams.get('activity') ?? 'all'}
              onChange={(e) => patchUrl({ activity: e.target.value, page: '1' })}
            >
              <option value="all">Any</option>
              <option value="active7">Active in last 7d</option>
              <option value="inactive30">Inactive 30d+</option>
              <option value="never">Never active</option>
              <option value="no_activity_after_signup">No activity after signup</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Flagged
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={searchParams.get('flagged') ?? 'all'}
              onChange={(e) => patchUrl({ flagged: e.target.value, page: '1' })}
            >
              <option value="all">Any</option>
              <option value="yes">Flagged</option>
              <option value="no">Not flagged</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Role
            <input
              key={`role-${searchParams.get('role') ?? ''}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="e.g. user, admin"
              defaultValue={searchParams.get('role') ?? ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  patchUrl({ role: (e.target as HTMLInputElement).value, page: '1' });
                }
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Sort
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={searchParams.get('sort') ?? 'created_desc'}
              onChange={(e) => patchUrl({ sort: e.target.value, page: '1' })}
            >
              <option value="created_desc">Newest</option>
              <option value="created_asc">Oldest</option>
              <option value="last_active_desc">Last active</option>
              <option value="spend_desc">Lifetime spend</option>
              <option value="credits_desc">Credits</option>
              <option value="usage_desc">Usage</option>
              <option value="email_asc">Email A–Z</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="mr-2 self-center font-semibold text-slate-500">Quick:</span>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() =>
              patchUrl({ joined: 'last7', activity: 'all', page: '1' })
            }
          >
            New (7d)
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() =>
              patchUrl({ plan: 'paying', page: '1' })
            }
          >
            Paying
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() =>
              patchUrl({ accountStatus: 'suspended', page: '1' })
            }
          >
            Suspended
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() =>
              patchUrl({ flagged: 'yes', page: '1' })
            }
          >
            Flagged
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() =>
              patchUrl({ activity: 'inactive30', page: '1' })
            }
          >
            Inactive
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() =>
              patchUrl({
                plan: 'all',
                accountStatus: 'all',
                joined: 'all',
                activity: 'all',
                flagged: 'all',
                q: '',
                page: '1',
              })
            }
          >
            Reset filters
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
          <span className="text-sm text-slate-600">
            {selected.size} selected · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <button
            type="button"
            className="rounded-xl bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700"
            onClick={() => setBulkOpen(true)}
            disabled={selected.size === 0}
          >
            Bulk actions
          </button>
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={exportCsv}
          >
            Export CSV (filters)
          </button>
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={exportSelectedCsv}
            disabled={selected.size === 0}
          >
            Export selected
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllPage}
                  aria-label="Select all on page"
                />
              </th>
              <th className="p-3">Customer</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Plan</th>
              <th className="p-3 text-right">Credits</th>
              <th className="p-3 text-right">Spend</th>
              <th className="p-3 text-right">Orders</th>
              <th className="p-3 text-right">Usage</th>
              <th className="p-3">Last active</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Badges</th>
              <th className="p-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td colSpan={13} className="p-3">
                      <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              : items.length === 0
                ? (
                    <tr>
                      <td colSpan={13} className="p-10 text-center text-slate-500">
                        No customers match these filters.
                      </td>
                    </tr>
                  )
                : (
                    items.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="p-3 align-middle">
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => toggleOne(row.id)}
                            aria-label={`Select ${row.email ?? row.id}`}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                              {row.image ? (
                                // eslint-disable-next-line @next/next/no-img-element -- admin avatars from arbitrary OAuth hosts
                                <img
                                  src={row.image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                                  {(row.name ?? row.email ?? '?').slice(0, 1).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {row.name ?? row.email ?? '—'}
                              </div>
                              <div className="text-xs text-slate-500">{row.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-700">{row.role}</td>
                        <td className="p-3">
                          <AccountStatusBadge status={row.accountStatus} />
                        </td>
                        <td className="p-3">
                          <PlanBadge
                            subscriptionStatus={row.subscriptionStatus}
                            plan={row.subscriptionPlan}
                          />
                        </td>
                        <td className="p-3 text-right tabular-nums">{row.creditBalance}</td>
                        <td className="p-3 text-right tabular-nums">
                          ${(row.lifetimeSpendCents / 100).toFixed(2)}
                        </td>
                        <td className="p-3 text-right tabular-nums">{row.totalOrders}</td>
                        <td className="p-3 text-right tabular-nums">{row.usageCount}</td>
                        <td className="p-3 text-slate-600">
                          {row.lastActiveAt
                            ? new Date(row.lastActiveAt).toLocaleString()
                            : '—'}
                        </td>
                        <td className="p-3 text-slate-600">
                          {new Date(row.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {row.isFlagged ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                                Flagged
                              </span>
                            ) : null}
                            {row.isVip ? (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-900">
                                VIP
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3">
                          <Link
                            href={`/admin/customers/${row.id}`}
                            className="font-semibold text-violet-600 hover:text-violet-800"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
          </tbody>
        </table>
      </div>

      {total > pageSize ? (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-200 disabled:opacity-40"
            onClick={() => patchUrl({ page: String(Math.max(1, page - 1)) })}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page * pageSize >= total}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-200 disabled:opacity-40"
            onClick={() => patchUrl({ page: String(page + 1) })}
          >
            Next
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={bulkOpen}
        title="Bulk action"
        confirmLabel="Run action"
        danger={
          bulkAction === 'suspend' ||
          bulkAction === 'flag' ||
          bulkAction === 'remove_tag'
        }
        onClose={() => setBulkOpen(false)}
        onConfirm={() => void runBulk()}
      >
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500">Action</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="suspend">Suspend</option>
              <option value="activate">Activate</option>
              <option value="flag">Flag</option>
              <option value="unflag">Unflag</option>
              <option value="grant_credits">Grant credits</option>
              <option value="add_tag">Add tag</option>
              <option value="remove_tag">Remove tag</option>
              <option value="add_note_template">Add internal note</option>
            </select>
          </label>
          {(bulkAction === 'add_tag' || bulkAction === 'remove_tag') && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Tag</span>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
              />
            </label>
          )}
          {bulkAction === 'grant_credits' && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Amount</span>
              <input
                type="number"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
              />
            </label>
          )}
          {bulkAction === 'add_note_template' && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Note</span>
              <textarea
                className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bulkTemplate}
                onChange={(e) => setBulkTemplate(e.target.value)}
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500">Reason (required)</span>
            <textarea
              className="min-h-[72px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
            />
          </label>
        </div>
      </ConfirmDialog>
    </div>
  );
}
