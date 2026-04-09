'use client';

import { useState } from 'react';
import type { CheckoutInterval } from '@/lib/stripe-client';
import { BRAND } from '@/lib/brand';

export default function PricingCard({
  onSubscribe,
  disabled,
}: {
  onSubscribe: (interval: CheckoutInterval) => void;
  disabled: boolean;
}) {
  const [interval, setInterval] = useState<CheckoutInterval>('month');
  const isAnnual = interval === 'year';

  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl shadow-rose-200/60 ring-1 ring-rose-100 sm:p-8">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-rose-500">
        {BRAND.productName}
      </div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
        {BRAND.planName}
      </h2>
      <p className="mt-3 text-sm text-slate-600">
        Unlock the full library of gently adventurous stories, with new episodes
        added over time.
      </p>

      <div
        className="mt-6 flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/80"
        role="group"
        aria-label="Billing period"
      >
        <button
          type="button"
          onClick={() => setInterval('month')}
          aria-pressed={!isAnnual}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            !isAnnual
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval('year')}
          aria-pressed={isAnnual}
          className={`relative flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            isAnnual
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Annual
          <span className="ml-1.5 inline-block rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            Save 20%
          </span>
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {isAnnual ? (
          <>
            <div className="text-4xl font-black text-slate-900">$96</div>
            <div className="text-sm font-semibold text-slate-500">/ year</div>
            <div className="w-full text-sm text-slate-600">
              $8/mo billed yearly — save vs $120 paid monthly
            </div>
          </>
        ) : (
          <>
            <div className="text-4xl font-black text-slate-900">$10</div>
            <div className="text-sm font-semibold text-slate-500">/ month</div>
          </>
        )}
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li>• Access to all premium stories and episodes</li>
        <li>• Stream friendly audio from any story page</li>
        <li>• Built for calm bedtime and quiet-time listening</li>
      </ul>
      <button
        type="button"
        onClick={() => onSubscribe(interval)}
        disabled={disabled}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-rose-50 shadow-md shadow-rose-300/80 hover:bg-rose-600 disabled:opacity-60"
      >
        {disabled
          ? 'Preparing checkout…'
          : isAnnual
            ? 'Subscribe for $96/year'
            : 'Subscribe for $10/month'}
      </button>
      <p className="mt-3 text-xs text-slate-400">
        Secure payments are handled by Stripe. You can manage or cancel your
        subscription anytime from the customer portal.
      </p>
    </div>
  );
}
