import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import StoryCard from '@/components/library/StoryCard';
import AccountSettingsPanel from '@/components/account/AccountSettingsPanel';
import {
  browseStoriesForSavedSlugs,
  fetchSavedStorySlugs,
} from '@/lib/userSavedStories';
import { BRAND } from '@/lib/brand';
import prisma from '@/lib/prisma';
import { getFirstTrialClaimExpiresAt, isStripePayingOrTrialing } from '@/lib/billing/premiumAccess';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/' });
      }}
    >
      <button
        type="submit"
        className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
      >
        Sign out
      </button>
    </form>
  );
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-5">
        <div className="rounded-3xl bg-white p-6 text-center shadow-xl ring-1 ring-slate-100">
          <h1 className="text-2xl font-black text-slate-900">
            You&apos;re not logged in
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Log in to see your {BRAND.productName} account and subscription.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sub = session.user.subscriptionStatus;
  const isStripeSubscribed = isStripePayingOrTrialing(sub);
  const firstTrialEnd = await getFirstTrialClaimExpiresAt(prisma, session.user.id);
  const freshUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, image: true },
  });

  const savedSlugs = await fetchSavedStorySlugs(session.user.id);
  const savedBrowseStories = await browseStoriesForSavedSlugs(savedSlugs);

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-0">
        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
          <h1 className="text-2xl font-black text-slate-900">Your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            {freshUser?.email ?? session.user.email}
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Subscription:{' '}
            <span className="font-semibold text-slate-900">{sub}</span>
          </p>
          {firstTrialEnd && firstTrialEnd.getTime() > Date.now() && !isStripeSubscribed ? (
            <p className="mt-2 text-sm text-emerald-800">
              App trial access until{' '}
              <span className="font-semibold">
                {firstTrialEnd.toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>{' '}
              (from your first trial offer; later offers do not extend this).
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {isStripeSubscribed && (
              <form
                action={async () => {
                  'use server';
                  const { stripe } = await import('@/lib/stripe-server');
                  if (!stripe) redirect('/account');
                  const { auth: getAuth } = await import('@/auth');
                  const s = await getAuth();
                  if (!s?.user?.id) redirect('/login');
                  const prisma = (await import('@/lib/prisma')).default;
                  const profile = await prisma.profile.findUnique({
                    where: { userId: s.user.id },
                  });
                  if (!profile?.stripeCustomerId) redirect('/account');
                  const { siteUrl } = await import('@/lib/stripe-server');
                  const base = siteUrl();
                  const portal = await stripe.billingPortal.sessions.create({
                    customer: profile.stripeCustomerId,
                    return_url: `${base}/account`,
                  });
                  redirect(portal.url!);
                }}
              >
                <button
                  type="submit"
                  className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                >
                  Manage billing
                </button>
              </form>
            )}
            <SignOutButton />
          </div>
        </div>

        <AccountSettingsPanel
          initialImageUrl={resolvePublicAssetUrl(
            freshUser?.image ?? session.user.image ?? null
          )}
          email={freshUser?.email ?? session.user.email}
        />

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
          <h2 className="text-xl font-black text-slate-900">Your saved series</h2>
          <p className="mt-1 text-sm text-slate-500">
            Stories you added from a series page appear here and in the library
            &quot;Saved&quot; view.
          </p>
          {savedBrowseStories.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">
              Nothing saved yet.{' '}
              <Link
                href="/library"
                className="font-bold text-rose-600 underline-offset-2 hover:underline"
              >
                Browse the library
              </Link>{' '}
              and tap &quot;Add to library&quot; on a story you love.
            </p>
          ) : (
            <ul className="mt-6 grid list-none gap-6 p-0 sm:grid-cols-2">
              {savedBrowseStories.map((story) => (
                <li key={story.slug}>
                  <StoryCard story={story} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
