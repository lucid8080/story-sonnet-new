'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PricingCard from '@/components/billing/PricingCard';
import { startCheckout, type CheckoutInterval } from '@/lib/stripe-client';

export default function PricingActions() {
  const { data: session } = useSession();
  const router = useRouter();
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sub = session?.user?.subscriptionStatus;
  const isSubscribed = sub === 'active' || sub === 'trialing';

  const handleSubscribeClick = async (interval: CheckoutInterval) => {
    if (!session?.user) {
      router.push('/signup?callbackUrl=/pricing');
      return;
    }
    try {
      setStartingCheckout(true);
      setError(null);
      await startCheckout({ interval });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setStartingCheckout(false);
    }
  };

  return (
    <>
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
