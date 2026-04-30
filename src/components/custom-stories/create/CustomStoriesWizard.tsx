'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CUSTOM_STORY_PACKAGE_CONFIG,
  formatUsdFromCents,
  priceCentsForPackage,
  resolveEpisodeCountForPackage,
  type CustomStoryPackageType,
} from '@/lib/custom-stories/config';

type WizardData = {
  packageType: CustomStoryPackageType;
  deluxeEpisodeCount: number;
  simpleIdea: string;
  nfcRequested: boolean;
};

const steps = ['Package', 'Simple idea'];

const initialData: WizardData = {
  packageType: 'basic',
  deluxeEpisodeCount: 7,
  simpleIdea: '',
  nfcRequested: false,
};

export function CustomStoriesWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>(initialData);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'generating'>('idle');
  const [briefFailed, setBriefFailed] = useState(false);

  useEffect(() => {
    const pkg = searchParams.get('packageType');
    const stepRaw = searchParams.get('step');
    const orderIdRaw = searchParams.get('orderId')?.trim() || '';
    const deluxeEpisodeRaw = Number(searchParams.get('episodeCount') ?? '');
    if (stepRaw === '1') {
      setStep(1);
    }
    if (
      pkg &&
      (Object.keys(CUSTOM_STORY_PACKAGE_CONFIG) as string[]).includes(pkg)
    ) {
      setData((prev) => ({
        ...prev,
        packageType: pkg as CustomStoryPackageType,
      }));
    }
    if (!Number.isNaN(deluxeEpisodeRaw) && deluxeEpisodeRaw >= 7 && deluxeEpisodeRaw <= 10) {
      setData((prev) => ({
        ...prev,
        deluxeEpisodeCount: deluxeEpisodeRaw,
      }));
    }
    setExistingOrderId(orderIdRaw || null);
  }, [searchParams]);

  const episodeCount = useMemo(
    () =>
      resolveEpisodeCountForPackage(
        data.packageType,
        data.packageType === 'deluxe' ? data.deluxeEpisodeCount : undefined
      ),
    [data.packageType, data.deluxeEpisodeCount]
  );
  const priceCents = useMemo(
    () => priceCentsForPackage(data.packageType, episodeCount),
    [data.packageType, episodeCount]
  );

  const canContinue = step === 1 ? data.simpleIdea.trim().length > 0 : true;

  async function submit() {
    try {
      setBusy(true);
      setError(null);
      if (existingOrderId && briefFailed) {
        router.push(`/custom-stories/${existingOrderId}/studio`);
        return;
      }
      if (existingOrderId) {
        setPhase('saving');
        const finalizeRes = await fetch(
          `/api/custom-stories/order/${encodeURIComponent(existingOrderId)}/finalize`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              simpleIdea: data.simpleIdea,
              nfcRequested: data.nfcRequested,
            }),
          }
        );
        if (finalizeRes.status === 401) {
          const callbackUrl = encodeURIComponent('/custom-stories/create');
          router.push(`/signup?callbackUrl=${callbackUrl}`);
          return;
        }
        const finalizeJson = await finalizeRes.json();
        if (!finalizeRes.ok) {
          throw new Error(finalizeJson.error ?? 'Could not save your story idea');
        }

        setPhase('generating');
        const briefRes = await fetch(
          `/api/custom-stories/${encodeURIComponent(existingOrderId)}/generate/brief`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }
        );
        if (briefRes.status === 401) {
          const callbackUrl = encodeURIComponent('/custom-stories/create');
          router.push(`/signup?callbackUrl=${callbackUrl}`);
          return;
        }
        let briefJson: { error?: string; ok?: boolean } = {};
        try {
          briefJson = await briefRes.json();
        } catch {
          briefJson = {};
        }
        if (!briefRes.ok) {
          setBriefFailed(true);
          setError(
            `${
              briefJson.error ?? 'Generating your Story Brief failed.'
            } Your idea was saved \u2014 tap Continue to studio to retry there.`
          );
          return;
        }
        router.push(`/custom-stories/${existingOrderId}/studio`);
        return;
      }
      const payload = {
        packageType: data.packageType,
        episodeCount,
        nfcRequested: data.nfcRequested,
        simpleIdea: data.simpleIdea,
      };
      const orderRes = await fetch('/api/custom-stories/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (orderRes.status === 401) {
        const callbackUrl = encodeURIComponent('/custom-stories/create');
        router.push(`/signup?callbackUrl=${callbackUrl}`);
        return;
      }
      const orderJson = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderJson.error ?? 'Could not create order');
      }
      const orderId = orderJson.order?.id;
      if (typeof orderId !== 'string' || !orderId) {
        throw new Error('Invalid order response');
      }
      const origin = window.location.origin;
      const checkoutRes = await fetch('/api/custom-stories/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          returnUrlSuccess: `${origin}/custom-stories/${orderId}/studio`,
          returnUrlCancel: `${origin}/custom-stories/create`,
        }),
      });
      if (checkoutRes.status === 401) {
        const callbackUrl = encodeURIComponent('/custom-stories/create');
        router.push(`/signup?callbackUrl=${callbackUrl}`);
        return;
      }
      let checkoutJson: { error?: string; url?: string } = {};
      try {
        checkoutJson = await checkoutRes.json();
      } catch {
        checkoutJson = {};
      }
      if (!checkoutRes.ok) {
        if (checkoutRes.status === 503) {
          throw new Error(
            checkoutJson.error ??
              'Payments are unavailable (Stripe is not configured on this server).'
          );
        }
        throw new Error(checkoutJson.error ?? 'Could not start checkout');
      }
      const stripeUrl = checkoutJson.url;
      if (typeof stripeUrl !== 'string' || !stripeUrl.trim()) {
        throw new Error('Checkout did not return a payment URL');
      }
      window.location.href = stripeUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your story.');
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-100 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
        Custom Stories
      </p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">Create your story</h1>
      <p className="mt-1 text-sm text-slate-600">
        Step {step + 1} of {steps.length}: {steps[step]}
      </p>

      <div className="mt-5">
        {step === 0 && (
          <div className="grid gap-3">
            {(Object.keys(CUSTOM_STORY_PACKAGE_CONFIG) as CustomStoryPackageType[]).map(
              (pkg) => {
                const isActive = data.packageType === pkg;
                return (
                  <button
                    type="button"
                    key={pkg}
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        packageType: pkg,
                        format:
                          resolveEpisodeCountForPackage(pkg, prev.deluxeEpisodeCount) > 1
                            ? 'mini-series'
                            : 'standalone',
                      }))
                    }
                    className={`rounded-2xl border p-4 text-left ${
                      isActive
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="font-bold text-slate-900">
                      {CUSTOM_STORY_PACKAGE_CONFIG[pkg].label}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {resolveEpisodeCountForPackage(pkg, data.deluxeEpisodeCount)} episodes,
                      max 5 minutes each
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-rose-600">
                      {pkg === 'deluxe'
                        ? `${formatUsdFromCents(CUSTOM_STORY_PACKAGE_CONFIG[pkg].basePriceCents)}+`
                        : formatUsdFromCents(CUSTOM_STORY_PACKAGE_CONFIG[pkg].basePriceCents)}
                    </div>
                  </button>
                );
              }
            )}
            {data.packageType === 'deluxe' && (
              <label className="text-sm text-slate-700">
                Episode count
                <select
                  value={data.deluxeEpisodeCount}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      deluxeEpisodeCount: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  {[7, 8, 9, 10].map((count) => (
                    <option key={count} value={count}>
                      {count} episodes
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Simple idea
              </label>
              <textarea
                placeholder="e.g. A shy robot who learns to sing"
                value={data.simpleIdea}
                onChange={(e) => {
                  setData((prev) => ({ ...prev, simpleIdea: e.target.value }));
                  if (briefFailed) {
                    setBriefFailed(false);
                    setError(null);
                  }
                }}
                className="mt-1 min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={data.nfcRequested}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, nfcRequested: e.target.checked }))
                }
              />
              Request NFC-ready gift support
            </label>

            <p className="text-sm font-semibold text-slate-900">
              Package: {CUSTOM_STORY_PACKAGE_CONFIG[data.packageType].label} · {episodeCount}{' '}
              episodes (max 5 min each) · Price: {formatUsdFromCents(priceCents)}
            </p>
            {existingOrderId ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Payment received. Add your simple idea and tap Create Story Brief
                {' \u2014 '}we&apos;ll save it and generate your Story Brief before
                taking you to the studio.
              </p>
            ) : null}
            {!session?.user && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Sign in is required to create your order and pay. When you tap Create Story
                Brief, we&apos;ll send you to sign up or log in, then to secure checkout.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(0, prev - 1))}
          disabled={step === 0 || busy}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 disabled:opacity-40"
        >
          Back
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((prev) => Math.min(steps.length - 1, prev + 1))}
            disabled={!canContinue || busy}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !data.simpleIdea.trim()}
            className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white disabled:opacity-40"
          >
            {phase === 'saving'
              ? 'Saving idea\u2026'
              : phase === 'generating'
                ? 'Generating brief\u2026'
                : briefFailed
                  ? 'Continue to studio'
                  : 'Create Story Brief'}
          </button>
        )}
      </div>
    </section>
  );
}
