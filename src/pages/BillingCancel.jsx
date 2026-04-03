import React from 'react';
import { Link } from 'react-router-dom';

export default function BillingCancel() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50 px-5">
      <div className="max-w-md rounded-3xl bg-white p-6 text-center shadow-xl shadow-slate-200 ring-1 ring-slate-100">
        <h1 className="text-2xl font-black text-slate-900">Checkout cancelled</h1>
        <p className="mt-3 text-sm text-slate-600">
          No worries—your card has not been charged. You can restart checkout whenever you&apos;re
          ready.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/pricing"
            className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50"
          >
            Back to pricing
          </Link>
          <Link
            to="/"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700"
          >
            Continue with free stories
          </Link>
        </div>
      </div>
    </div>
  );
}

