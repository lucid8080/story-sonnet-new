import React from 'react';

export default function PricingCard({ onSubscribe, disabled }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl shadow-rose-200/60 ring-1 ring-rose-100 sm:p-8">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-rose-500">Story Sonnet</div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
        Story Sonnet Premium
      </h2>
      <p className="mt-3 text-sm text-slate-600">
        Unlock the full library of gently adventurous stories, with new episodes added over time.
      </p>

      <div className="mt-6 flex items-baseline gap-2">
        <div className="text-4xl font-black text-slate-900">$10</div>
        <div className="text-sm font-semibold text-slate-500">/ month</div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li>• Access to all premium stories and episodes</li>
        <li>• Stream friendly audio from any story page</li>
        <li>• Built for calm bedtime and quiet-time listening</li>
      </ul>

      <button
        type="button"
        onClick={onSubscribe}
        disabled={disabled}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-rose-50 shadow-md shadow-rose-300/80 hover:bg-rose-600 disabled:opacity-60"
      >
        {disabled ? 'Preparing checkout…' : 'Subscribe for $10/month'}
      </button>

      <p className="mt-3 text-xs text-slate-400">
        Secure payments are handled by Stripe. You can manage or cancel your subscription anytime
        from the customer portal.
      </p>
    </div>
  );
}

