'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { z } from 'zod';

function mergeTrialCampaignIntoCallback(callbackUrl: string, trialCampaignId: string | null): string {
  if (!trialCampaignId) return callbackUrl;
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const u = new URL(callbackUrl, base);
    u.searchParams.set('trialCampaignId', trialCampaignId);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return callbackUrl;
  }
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const trialOfferFromBar = searchParams.get('ref') === 'trial_offer';
  const trialCampaignIdRaw = searchParams.get('trialCampaignId')?.trim() || null;
  const trialCampaignId =
    trialCampaignIdRaw && z.string().cuid().safeParse(trialCampaignIdRaw).success
      ? trialCampaignIdRaw
      : null;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign up failed');
        setSubmitting(false);
        return;
      }
      const sign = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (sign?.error) {
        setError('Account created but sign-in failed. Try logging in.');
        setSubmitting(false);
        return;
      }
      if (trialOfferFromBar && trialCampaignId) {
        try {
          await fetch('/api/campaigns/trial/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: trialCampaignId }),
          });
        } catch {
          /* non-fatal: user can still subscribe; checkout trial requires a claim */
        }
      }
      const nextUrl =
        trialOfferFromBar && trialCampaignId
          ? mergeTrialCampaignIntoCallback(callbackUrl, trialCampaignId)
          : callbackUrl;
      router.replace(nextUrl);
    } catch {
      setError('Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50">
      <div className="mx-auto max-w-md px-5 py-10 sm:px-0">
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200 ring-1 ring-slate-100">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Save progress and unlock premium listening when you subscribe.
          </p>
          {trialOfferFromBar ? (
            <div
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950 ring-1 ring-emerald-100"
              role="status"
            >
              <p className="font-semibold text-emerald-900">Free trial offer is active</p>
              <p className="mt-1 text-emerald-800">
                Create your account here, then continue to membership pricing to start checkout. Your free trial
                period runs on the subscription after you subscribe (no promo code needed for this offer).
              </p>
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 ring-1 ring-rose-100">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-50 shadow-md disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Sign up'}
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-rose-600">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
