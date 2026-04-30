'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  CUSTOM_STORY_PACKAGE_CONFIG,
  formatUsdFromCents,
  type CustomStoryPackageType,
} from '@/lib/custom-stories/config';

type BusyState = {
  packageType: CustomStoryPackageType;
  running: boolean;
};

export function PackagePurchaseGrid() {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState<BusyState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function purchasePackage(packageType: CustomStoryPackageType) {
    try {
      setError(null);
      setBusy({ packageType, running: true });
      if (!session?.user?.id) {
        const callbackUrl = encodeURIComponent('/custom-stories');
        router.push(`/signup?callbackUrl=${callbackUrl}`);
        return;
      }
      const pkg = CUSTOM_STORY_PACKAGE_CONFIG[packageType];
      const orderRes = await fetch('/api/custom-stories/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageType,
          episodeCount: pkg.defaultEpisodeCount,
          nfcRequested: false,
        }),
      });
      if (orderRes.status === 401) {
        const callbackUrl = encodeURIComponent('/custom-stories');
        router.push(`/signup?callbackUrl=${callbackUrl}`);
        return;
      }
      const orderJson = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderJson.error ?? 'Could not create order');
      }
      const orderId = String(orderJson.order?.id ?? '');
      if (!orderId) {
        throw new Error('Could not start purchase (missing order id).');
      }
      const origin = window.location.origin;
      const success = new URL('/custom-stories/create', origin);
      success.searchParams.set('step', '1');
      success.searchParams.set('source', 'package-purchase');
      success.searchParams.set('orderId', orderId);
      success.searchParams.set('packageType', packageType);
      success.searchParams.set('episodeCount', String(pkg.defaultEpisodeCount));
      const checkoutRes = await fetch('/api/custom-stories/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          returnUrlSuccess: success.toString(),
          returnUrlCancel: `${origin}/custom-stories`,
        }),
      });
      let checkoutJson: { error?: string; url?: string } = {};
      try {
        checkoutJson = await checkoutRes.json();
      } catch {
        checkoutJson = {};
      }
      if (!checkoutRes.ok) {
        throw new Error(checkoutJson.error ?? 'Could not start checkout');
      }
      const stripeUrl = checkoutJson.url;
      if (!stripeUrl) {
        throw new Error('Checkout URL was not returned by the server.');
      }
      window.location.href = stripeUrl;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not start package purchase.'
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5">
      {error ? (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(CUSTOM_STORY_PACKAGE_CONFIG) as CustomStoryPackageType[]).map(
          (key) => {
            const pkg = CUSTOM_STORY_PACKAGE_CONFIG[key];
            const isBusy = busy?.packageType === key && busy.running;
            return (
              <article key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-lg font-bold text-slate-900">{pkg.label}</h3>
                <p className="mt-1 text-sm font-semibold text-rose-600">
                  {pkg.perEpisodeCents
                    ? `${formatUsdFromCents(pkg.basePriceCents)} for ${pkg.defaultEpisodeCount} episodes + ${formatUsdFromCents(pkg.perEpisodeCents)} per extra episode`
                    : `${formatUsdFromCents(pkg.basePriceCents)} one-time`}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {pkg.features.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void purchasePackage(key)}
                  disabled={isBusy}
                  className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isBusy ? 'Starting...' : 'Purchase'}
                </button>
              </article>
            );
          }
        )}
      </div>
    </div>
  );
}
