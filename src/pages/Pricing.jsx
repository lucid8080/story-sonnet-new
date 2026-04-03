import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PricingCard from '../components/billing/PricingCard.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { startCheckout } from '../lib/stripe.js';

export default function Pricing() {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubscribeClick = async () => {
    if (!user) {
      navigate('/signup', { state: { from: { pathname: '/pricing' } } });
      return;
    }

    try {
      setStartingCheckout(true);
      setError(null);
      await startCheckout();
    } catch (e) {
      setError(e.message || 'Unable to start checkout right now.');
    } finally {
      setStartingCheckout(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-0">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-500 shadow-sm ring-1 ring-rose-100">
            Story Sonnet Premium
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            One simple plan for cozy story time
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Keep the free stories, and unlock premium adventures when you&apos;re ready. You can
            cancel anytime.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <PricingCard onSubscribe={handleSubscribeClick} disabled={startingCheckout} />

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
                <Link to="/" className="font-semibold text-rose-600 hover:text-rose-700">
                  the stories
                </Link>{' '}
                and enjoy listening.
              </p>
            ) : (
              <p>
                When your subscription is active, you&apos;ll see premium stories unlocked
                automatically in your library.
              </p>
            )}

            {error && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 ring-1 ring-rose-100">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

