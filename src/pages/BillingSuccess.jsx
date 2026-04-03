import React from 'react';
import { Link } from 'react-router-dom';

export default function BillingSuccess() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-emerald-50 via-amber-50/40 to-sky-50 px-5">
      <div className="max-w-md rounded-3xl bg-white p-6 text-center shadow-xl shadow-emerald-100 ring-1 ring-emerald-100">
        <h1 className="text-2xl font-black text-slate-900">Subscription confirmed</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your Story Sonnet Premium subscription is active. It may take a moment for your account to
          reflect the update.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50"
          >
            Go to stories
          </Link>
          <Link
            to="/account"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700"
          >
            View account
          </Link>
        </div>
      </div>
    </div>
  );
}

