'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import PricingCard from '@/components/billing/PricingCard';
import { startCheckout, type CheckoutInterval } from '@/lib/stripe-client';

function safeStoryReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return null;
  if (!t.startsWith('/story/')) return null;
  return t;
}

export default function PricingActions() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToStory = safeStoryReturnPath(searchParams.get('callbackUrl'));
  const trialCampaignId = searchParams.get('trialCampaignId')?.trim() || null;
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoOk, setPromoOk] = useState<string | null>(null);
  const [promoErr, setPromoErr] = useState<string | null>(null);

  const sub = session?.user?.subscriptionStatus;
  const isSubscribed = sub === 'active' || sub === 'trialing';

  useEffect(() => {
    if (!session?.user?.id || !trialCampaignId) return;
    if (!z.string().cuid().safeParse(trialCampaignId).success) return;
    void fetch('/api/campaigns/trial/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: trialCampaignId }),
    }).catch(() => {});
  }, [session?.user?.id, trialCampaignId]);

  const validatePromo = async () => {
    setPromoBusy(true);
    setPromoErr(null);
    setPromoOk(null);
    try {
      const res = await fetch('/api/campaigns/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      });
      const j = await res.json();
      if (!res.ok) {
        setPromoErr(j.error || 'Invalid code');
        return;
      }
      setPromoOk(j.promo?.publicTitle || 'Code applied');
    } catch (e) {
      setPromoErr(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setPromoBusy(false);
    }
  };

  const handleSubscribeClick = async (interval: CheckoutInterval) => {
    if (!session?.user) {
      router.push('/signup?callbackUrl=/pricing');
      return;
    }
    try {
      setStartingCheckout(true);
      setError(null);
      await startCheckout({ interval, trialCampaignId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setStartingCheckout(false);
    }
  };

  return (
    <>
      {returnToStory ? (
        <div className="mb-4 rounded-2xl bg-white/90 p-4 text-center text-sm text-slate-700 shadow-sm ring-1 ring-slate-100">
          <Link
            href={returnToStory}
            className="font-semibold text-rose-600 hover:text-rose-700"
          >
            Back to listening
          </Link>
        </div>
      ) : null}
      <div className="mb-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Promo code
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter code"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-rose-100 focus:ring-2 sm:max-w-xs"
          />
          <button
            type="button"
            disabled={promoBusy || !promoCode.trim()}
            onClick={() => void validatePromo()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {promoBusy ? 'Checking…' : 'Validate'}
          </button>
        </div>
        {promoOk ? (
          <p className="mt-2 text-sm font-medium text-emerald-700">{promoOk}</p>
        ) : null}
        {promoErr ? (
          <p className="mt-2 text-sm font-medium text-rose-600">{promoErr}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          Checkout does not yet apply discounts automatically; this confirms your code is valid for your
          account.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <PricingCard
          onSubscribe={handleSubscribeClick}
          disabled={startingCheckout}
        />
        <div className="space-y-4 rounded-3xl bg-white/80 p-5 text-sm text-slate-600 ring-1 ring-slate-100">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            What you get
          </h2>
          <ul className="space-y-1">
            <li>• Premium-only story series and extra episodes</li>
            <li>• Calm audio player designed for bedtime and car rides</li>
            <li>• Access from any device where you&apos;re signed in</li>
          </ul>
          <h2 className="pt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Already subscribed?
          </h2>
          {isSubscribed ? (
            <p>
              You already have an active subscription. Head back to{' '}
              <Link
                href="/"
                className="font-semibold text-rose-600 hover:text-rose-700"
              >
                the stories
              </Link>
              .
            </p>
          ) : (
            <p>
              When your subscription is active, you&apos;ll see premium stories
              unlocked automatically in your library.
            </p>
          )}
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 ring-1 ring-rose-100">
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
