import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';

export default function Account() {
  const { user, profile, signOut } = useAuth();
  const { subscriptionStatus, isSubscribed } = useSubscription();

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-5">
        <div className="rounded-3xl bg-white p-6 text-center shadow-xl shadow-slate-200 ring-1 ring-slate-100">
          <h1 className="text-2xl font-black text-slate-900">You&apos;re not logged in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Log in to see your Story Sonnet account and subscription.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              to="/login"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-0">
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200 ring-1 ring-slate-100">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your profile and Story Sonnet subscription.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Profile
              </h2>
              <div className="space-y-1 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-500">Email:</span> {user.email}
                </p>
                {profile?.full_name && (
                  <p>
                    <span className="font-semibold text-slate-500">Name:</span> {profile.full_name}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Profile editing can be expanded later in the admin or settings area.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Subscription
              </h2>
              <p className="text-sm text-slate-700">
                Status:{' '}
                <span className={isSubscribed ? 'font-semibold text-emerald-600' : 'font-semibold text-slate-700'}>
                  {subscriptionStatus || 'free'}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Once Stripe is connected, this section will also link to your customer portal.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/pricing"
                  className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50 shadow-sm shadow-rose-300/70"
                >
                  {isSubscribed ? 'View premium stories' : 'Upgrade to Premium'}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700"
            >
              Back to stories
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

