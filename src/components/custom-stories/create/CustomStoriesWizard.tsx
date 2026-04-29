'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>(initialData);

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
      router.push(`/custom-stories/${orderJson.order.id}/studio`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your story.');
    } finally {
      setBusy(false);
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
                onChange={(e) =>
                  setData((prev) => ({ ...prev, simpleIdea: e.target.value }))
                }
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
            {!session?.user && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                You can build without logging in. We&apos;ll ask you to sign in before
                creating your Story Brief workspace.
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
            {busy ? 'Creating...' : 'Create Story Brief'}
          </button>
        )}
      </div>
    </section>
  );
}
