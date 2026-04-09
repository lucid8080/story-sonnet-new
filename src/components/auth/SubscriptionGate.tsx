'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND } from '@/lib/brand';

export default function SubscriptionGate({
  isPremium,
  isSubscribed,
  children,
}: {
  isPremium: boolean;
  isSubscribed: boolean;
  children: ReactNode;
}) {
  if (!isPremium || isSubscribed) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-50">{children}</div>
      <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center">
        <div className="max-w-xs rounded-2xl bg-slate-950/85 px-4 py-4 text-center text-sm text-slate-50 shadow-xl backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
            Premium story
          </div>
          <p className="mt-2 text-sm text-slate-100">
            This story is part of {BRAND.planName}. Subscribe to unlock all
            premium episodes.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50"
          >
            View pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
