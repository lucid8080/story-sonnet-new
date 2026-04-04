import Link from 'next/link';
import { auth } from '@/auth';
import { agentDebugLog } from '@/lib/agent-debug-log';
import { stripe } from '@/lib/stripe-server';
import { syncSubscriptionFromCheckoutReturn } from '@/lib/syncSubscriptionFromCheckoutReturn';

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = await auth();

  if (session?.user?.id && session_id?.trim() && stripe) {
    await syncSubscriptionFromCheckoutReturn({
      stripe,
      userId: session.user.id,
      checkoutSessionId: session_id.trim(),
    });
  } else if (session?.user?.id && !session_id?.trim()) {
    // #region agent log
    agentDebugLog({
      location: 'billing/success/page.tsx',
      message: 'no session_id on success URL — checkout success_url missing template',
      hypothesisId: 'H7',
      hasStripe: !!stripe,
    });
    // #endregion
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="text-2xl font-black text-slate-900">You&apos;re subscribed!</h1>
      <p className="mt-3 text-sm text-slate-600">
        Thanks for supporting Story Sonnet. If your account still shows Free,
        open Account once more — your subscription is saved from this checkout.
      </p>
      <Link
        href="/account"
        className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
      >
        View account
      </Link>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white"
      >
        Back to stories
      </Link>
    </div>
  );
}
