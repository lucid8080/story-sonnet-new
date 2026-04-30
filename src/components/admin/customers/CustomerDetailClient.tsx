'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AccountStatusBadge, PlanBadge } from './badges';
import { CUSTOM_STORIES_FEATURE_TAG } from '@/lib/features/customStoriesAccessCore';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'account', label: 'Account' },
  { id: 'billing', label: 'Billing' },
  { id: 'credits', label: 'Credits' },
  { id: 'usage', label: 'Usage' },
  { id: 'orders', label: 'Orders' },
  { id: 'saved', label: 'Saved / liked' },
  { id: 'support', label: 'Support' },
  { id: 'security', label: 'Security' },
  { id: 'actions', label: 'Admin actions' },
  { id: 'audit', label: 'Audit log' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function CustomerDetailClient({ customerId }: { customerId: string }) {
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [activity, setActivity] = useState<Record<string, unknown> | null>(null);
  const [audit, setAudit] = useState<Record<string, unknown> | null>(null);
  const [notes, setNotes] = useState<Record<string, unknown> | null>(null);
  const [purchases, setPurchases] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null);

  const [patchReason, setPatchReason] = useState('Profile update from admin');
  const [creditAmount, setCreditAmount] = useState('0');
  const [creditReason, setCreditReason] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [newNote, setNewNote] = useState('');

  const loadCore = useCallback(async () => {
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed');
    setDetail(json.data);
  }, [customerId]);

  const loadSecondary = useCallback(async () => {
    const [a, au, n, p, s] = await Promise.all([
      fetch(`/api/admin/customers/${customerId}/activity`, { credentials: 'include' }).then(
        (r) => r.json()
      ),
      fetch(`/api/admin/customers/${customerId}/audit?pageSize=50`, {
        credentials: 'include',
      }).then((r) => r.json()),
      fetch(`/api/admin/customers/${customerId}/notes?pageSize=50`, {
        credentials: 'include',
      }).then((r) => r.json()),
      fetch(`/api/admin/customers/${customerId}/purchases`, {
        credentials: 'include',
      }).then((r) => r.json()),
      fetch(`/api/admin/customers/${customerId}/saved`, {
        credentials: 'include',
      }).then((r) => r.json()),
    ]);
    if (a.ok) setActivity(a.data);
    if (au.ok) setAudit(au.data);
    if (n.ok) setNotes(n.data);
    if (p.ok) setPurchases(p.data);
    if (s.ok) setSaved(s.data);
  }, [customerId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadCore();
        if (!cancelled) await loadSecondary();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCore, loadSecondary]);

  async function patchProfile(payload: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...payload, reason: patchReason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Update failed');
      toast.success('Saved');
      await loadCore();
      await loadSecondary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function postCredits() {
    const amount = Number(creditAmount);
    if (!creditReason.trim() || creditReason.trim().length < 3) {
      toast.error('Reason required (min 3 chars)');
      return;
    }
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          reason: creditReason,
          source: 'admin_ui',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Credits updated');
      setCreditReason('');
      await loadCore();
      await loadSecondary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function postStatus(status: string) {
    if (statusReason.trim().length < 3) {
      toast.error('Reason required');
      return;
    }
    if (
      (status === 'banned' || status === 'suspended') &&
      !window.confirm(`Change account status to ${status}?`)
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountStatus: status,
          reason: statusReason,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Status updated');
      setStatusReason('');
      await loadCore();
      await loadSecondary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: newNote, visibility: 'internal' }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Note added');
      setNewNote('');
      const n = await fetch(`/api/admin/customers/${customerId}/notes?pageSize=50`, {
        credentials: 'include',
      }).then((r) => r.json());
      if (n.ok) setNotes(n.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function postAction(
    action:
      | 'impersonate_placeholder'
      | 'send_password_reset_placeholder'
      | 'resend_welcome_placeholder'
      | 'verify_email_manual'
      | 'reset_credits'
      | 'mark_premium'
      | 'remove_premium'
  ) {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason: statusReason || 'Admin action' }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Action recorded');
      await loadCore();
      await loadSecondary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (loading || !detail) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  const user = detail.user as {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    emailVerified: string | null;
  };
  const profile = detail.profile as Record<string, unknown>;
  const rawInternalTags = Array.isArray(profile.internalTags)
    ? profile.internalTags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  const normalizedInternalTags = rawInternalTags.map((tag) => tag.trim().toLowerCase());
  const customStoriesEnabled = normalizedInternalTags.includes(CUSTOM_STORIES_FEATURE_TAG);
  const engagement = detail.engagement as Record<string, number> | undefined;
  const billing = detail.billing as Record<string, number>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/customers"
            className="text-sm font-semibold text-violet-600 hover:text-violet-800"
          >
            ← Customers
          </Link>
          <h1 className="mt-2 text-2xl font-black text-slate-900">
            {user.name ?? user.email ?? 'Customer'}
          </h1>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="mt-1 font-mono text-xs text-slate-400">{user.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AccountStatusBadge status={String(profile.accountStatus)} />
          <PlanBadge
            subscriptionStatus={String(profile.subscriptionStatus)}
            plan={profile.subscriptionPlan as string | null}
          />
          {profile.isFlagged ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
              Flagged
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'rounded-full bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white'
                : 'rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Snapshot
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Credits</dt>
                <dd className="font-semibold">{String(profile.creditBalance)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Lifetime spend (profile)</dt>
                <dd className="font-semibold">
                  ${(Number(profile.lifetimeSpendCents) / 100).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Usage (engagement)</dt>
                <dd className="font-semibold">{engagement?.total ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Last active</dt>
                <dd className="font-semibold text-right">
                  {profile.lastActiveAt
                    ? new Date(String(profile.lastActiveAt)).toLocaleString()
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Compliance (COPPA-ready)
            </h2>
            <ul className="mt-3 list-inside list-disc text-sm text-slate-600">
              <li>Guardian-managed: {profile.isGuardianManaged ? 'yes' : 'no'}</li>
              <li>Minor account: {profile.isMinorAccount ? 'yes' : 'no'}</li>
              <li>Communication restricted: {profile.communicationRestricted ? 'yes' : 'no'}</li>
              <li>Consent: {profile.consentStatus ? String(profile.consentStatus) : '—'}</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <label className="block text-xs font-semibold text-slate-500">
            Audit reason (required for save)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={patchReason}
              onChange={(e) => setPatchReason(e.target.value)}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-500">Display name</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                defaultValue={user.name ?? ''}
                id="fld-name"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-500">Email</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                defaultValue={user.email ?? ''}
                id="fld-email"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-500">Full name (profile)</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                defaultValue={(profile.fullName as string) ?? ''}
                id="fld-fullName"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-500">Subscription plan label</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                defaultValue={(profile.subscriptionPlan as string) ?? ''}
                id="fld-plan"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={Boolean(profile.marketingOptIn)} id="fld-mkt" />
            Marketing opt-in
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              onClick={() => {
                const name = (document.getElementById('fld-name') as HTMLInputElement).value;
                const email = (document.getElementById('fld-email') as HTMLInputElement).value;
                const fullName = (document.getElementById('fld-fullName') as HTMLInputElement).value;
                const subscriptionPlan = (document.getElementById('fld-plan') as HTMLInputElement).value;
                const marketingOptIn = (document.getElementById('fld-mkt') as HTMLInputElement).checked;
                void patchProfile({
                  name,
                  email,
                  fullName: fullName || null,
                  subscriptionPlan: subscriptionPlan || null,
                  marketingOptIn,
                });
              }}
            >
              Save profile
            </button>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-800">Internal tags</h3>
            <p className="text-xs text-slate-500">
              JSON-backed tags; edit as comma-separated for now.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  customStoriesEnabled
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Custom Stories access: {customStoriesEnabled ? 'enabled' : 'disabled'}
              </span>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => {
                  const nextTags = customStoriesEnabled
                    ? rawInternalTags.filter(
                        (tag) => tag.trim().toLowerCase() !== CUSTOM_STORIES_FEATURE_TAG
                      )
                    : [...rawInternalTags, CUSTOM_STORIES_FEATURE_TAG];
                  void patchProfile({ internalTags: nextTags });
                }}
              >
                {customStoriesEnabled ? 'Disable Custom Stories' : 'Enable Custom Stories'}
              </button>
            </div>
            <input
              id="fld-tags"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              defaultValue={JSON.stringify(profile.internalTags ?? [])}
            />
            <button
              type="button"
              className="mt-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                try {
                  const raw = (document.getElementById('fld-tags') as HTMLInputElement).value;
                  const tags = JSON.parse(raw) as unknown;
                  if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) {
                    throw new Error('Must be a JSON string array');
                  }
                  void patchProfile({ internalTags: tags });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Invalid tags');
                }
              }}
            >
              Save tags
            </button>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-800">COPPA / family</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={Boolean(profile.isGuardianManaged)} id="fld-guardian" />
                Guardian-managed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={Boolean(profile.isMinorAccount)} id="fld-minor" />
                Minor account
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={Boolean(profile.communicationRestricted)}
                  id="fld-comrestricted"
                />
                Communication restricted
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-xs font-semibold text-slate-500">Compliance notes (internal)</span>
              <textarea
                id="fld-compliance"
                className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                defaultValue={(profile.complianceNotes as string) ?? ''}
              />
            </label>
            <button
              type="button"
              className="mt-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                void patchProfile({
                  isGuardianManaged: (document.getElementById('fld-guardian') as HTMLInputElement).checked,
                  isMinorAccount: (document.getElementById('fld-minor') as HTMLInputElement).checked,
                  communicationRestricted: (document.getElementById('fld-comrestricted') as HTMLInputElement).checked,
                  complianceNotes:
                    (document.getElementById('fld-compliance') as HTMLTextAreaElement).value || null,
                });
              }}
            >
              Save compliance fields
            </button>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm text-slate-600">
            Stripe customer id:{' '}
            <span className="font-mono text-xs">
              {(profile.stripeCustomerId as string) ?? '—'}
            </span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Subscription status (webhook-synced):{' '}
            <strong>{String(profile.subscriptionStatus)}</strong>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Lifetime spend (profile field): ${(Number(profile.lifetimeSpendCents) / 100).toFixed(2)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Purchases recorded: {billing?.purchaseCount ?? 0} · Sum from purchase rows: $
            {((billing?.lifetimeSpendFromPurchasesCents ?? 0) / 100).toFixed(2)}
          </p>
          <p className="mt-4 text-xs text-slate-400">
            TODO: Sync invoices into `CustomerPurchase` from Stripe webhooks; portal link for payment
            method updates lives on the public account page.
          </p>
        </div>
      )}

      {tab === 'credits' && (
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-lg font-bold">Balance: {String(profile.creditBalance)}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-500">Amount (negative to revoke)</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-500">Reason</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void postCredits()}
          >
            Apply adjustment
          </button>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-800">Recent ledger</h3>
            <ul className="mt-2 max-h-60 space-y-2 overflow-auto text-xs text-slate-600">
              {(detail.creditLedgerPreview as Array<Record<string, unknown>>)?.map((row) => (
                <li key={String(row.id)} className="rounded-lg bg-slate-50 px-2 py-1">
                  {String(row.createdAt)} · {String(row.type)} · {String(row.amount)} → bal{' '}
                  {String(row.balanceAfter)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'usage' && !activity && (
        <p className="text-sm text-slate-500">Loading usage…</p>
      )}

      {tab === 'usage' && activity && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-5 text-sm">
            {Object.entries((activity.counts as Record<string, number>) ?? {}).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs uppercase text-slate-500">{k}</div>
                <div className="text-lg font-bold">{v}</div>
              </div>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-bold text-slate-800">Recent feed</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            {((activity.feed as Array<Record<string, string>>) ?? []).map((row, i) => (
              <li key={i}>
                {row.at}: {row.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'orders' && purchases && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Product</th>
                <th className="p-3">Status</th>
                <th className="p-3">Provider ref</th>
              </tr>
            </thead>
            <tbody>
              {((purchases.purchases as Array<Record<string, unknown>>) ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No purchase rows yet. Sync from Stripe later.
                  </td>
                </tr>
              ) : (
                ((purchases.purchases as Array<Record<string, unknown>>) ?? []).map((p) => (
                  <tr key={String(p.id)} className="border-t border-slate-100">
                    <td className="p-3">{String(p.createdAt)}</td>
                    <td className="p-3">
                      ${(Number(p.amountCents) / 100).toFixed(2)} {String(p.currency)}
                    </td>
                    <td className="p-3">{String(p.productType)}</td>
                    <td className="p-3">{String(p.status)}</td>
                    <td className="p-3 font-mono text-xs">{String(p.providerRef ?? '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'saved' && saved && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h3 className="font-bold text-slate-800">Saved</h3>
            <ul className="mt-2 max-h-80 space-y-1 overflow-auto text-sm text-slate-600">
              {((saved.saved as Array<{ storySlug: string }>) ?? []).map((s) => (
                <li key={s.storySlug}>{s.storySlug}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h3 className="font-bold text-slate-800">Likes</h3>
            <ul className="mt-2 max-h-80 space-y-1 overflow-auto text-sm text-slate-600">
              {((saved.likes as Array<{ storySlug: string }>) ?? []).map((s) => (
                <li key={s.storySlug}>{s.storySlug}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'support' && notes && (
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <textarea
            className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Internal note…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button
            type="button"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void addNote()}
          >
            Add note
          </button>
          <ul className="space-y-3 border-t border-slate-100 pt-4">
            {((notes.notes as Array<Record<string, unknown>>) ?? []).map((n) => (
              <li key={String(n.id)} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="text-xs text-slate-500">
                  {String(n.createdAt)} · {String((n.author as { email?: string })?.email ?? '')}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{String(n.body)}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">Support tickets integration — TODO (placeholder).</p>
        </div>
      )}

      {tab === 'security' && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm text-slate-600">
            Active sessions (not expired):{' '}
            <strong>{String(detail.activeSessionCount ?? '—')}</strong>
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Login count (profile): {String(profile.loginCount)}
          </p>
          <p className="mt-4 text-xs text-slate-400">
            TODO: IP / device list, password reset events — store in `CustomerSessionEvent` or extend
            auth logging. Never expose raw session tokens in admin UI.
          </p>
        </div>
      )}

      {tab === 'actions' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h3 className="text-sm font-bold text-amber-900">Reason for destructive actions</h3>
            <textarea
              className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Required for suspend, ban, credit reset, etc."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => void postStatus('suspended')}
            >
              Suspend
            </button>
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => void postStatus('active')}
            >
              Activate
            </button>
            <button
              type="button"
              className="rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => void postStatus('banned')}
            >
              Ban
            </button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
              onClick={() =>
                void postAction('verify_email_manual')
              }
            >
              Verify email (manual)
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white"
              onClick={() =>
                void postAction('reset_credits')
              }
            >
              Reset credits
            </button>
            <button
              type="button"
              className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => void postAction('mark_premium')}
            >
              Mark VIP / premium
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-500 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => void postAction('remove_premium')}
            >
              Remove VIP
            </button>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            <p className="font-semibold text-slate-700">Placeholders (audit-only)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200"
                onClick={() => void postAction('impersonate_placeholder')}
              >
                Impersonate (not wired)
              </button>
              <button
                type="button"
                className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200"
                onClick={() => void postAction('send_password_reset_placeholder')}
              >
                Password reset email
              </button>
              <button
                type="button"
                className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200"
                onClick={() => void postAction('resend_welcome_placeholder')}
              >
                Welcome email
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && audit && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Action</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {((audit.entries as Array<Record<string, unknown>>) ?? []).map((e) => (
                <tr key={String(e.id)} className="border-t border-slate-100">
                  <td className="p-3 whitespace-nowrap text-xs">{String(e.createdAt)}</td>
                  <td className="p-3 font-mono text-xs">{String(e.actionType)}</td>
                  <td className="p-3 text-xs">
                    {String((e.actor as { email?: string })?.email ?? '')}
                  </td>
                  <td className="p-3 text-xs">{String(e.reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
