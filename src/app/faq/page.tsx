import type { Metadata } from 'next';
import Link from 'next/link';

import { BRAND } from '@/lib/brand';

const SUPPORT_EMAIL = 'support@sozoplay.com';

const linkClass =
  'font-medium text-primary underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm';

export const metadata: Metadata = {
  title: `FAQ | ${BRAND.productName}`,
  description: `Answers about ${BRAND.productName}, ${BRAND.planName}, listening, and your account.`,
};

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-neutral-800">
      <h1 className="mb-6 text-3xl font-bold text-neutral-900">
        Frequently asked questions
      </h1>

      <p className="mb-10 text-neutral-700">
        Quick answers about listening, accounts, and membership. For legal detail,
        see our{' '}
        <Link href="/privacy" className={linkClass}>
          Privacy Policy
        </Link>
        .
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          What is Sozo Play?
        </h2>
        <p>
          {BRAND.productName} is an audio story platform for families—browse the{' '}
          <Link href="/library" className={linkClass}>
            library
          </Link>
          , open a story, and listen episode by episode. For a short walkthrough, see{' '}
          <Link href="/how-it-works" className={linkClass}>
            How it works
          </Link>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          Do I need an account?
        </h2>
        <p>
          You can explore and listen without signing in. Creating an account lets you
          save favorites in the library and subscribe to {BRAND.planName} when you
          are ready.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          What is the difference between free and premium?
        </h2>
        <p className="mb-4">
          A selection of stories stays free to enjoy. {BRAND.planName} unlocks
          premium-only series and extra episodes; pricing and plan details are on the{' '}
          <Link href="/pricing" className={linkClass}>
            pricing page
          </Link>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          How does billing work?
        </h2>
        <p>
          Checkout and subscriptions are processed securely through{' '}
          <strong>Stripe</strong>. You can choose <strong>monthly</strong> or{' '}
          <strong>annual</strong> billing for {BRAND.planName}. When your subscription
          is active or trialing, premium stories unlock automatically in your library.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          How do I cancel or update payment?
        </h2>
        <p>
          Sign in and open{' '}
          <Link href="/account" className={linkClass}>
            Your account
          </Link>
          . If you have an active subscription, you can open the Stripe customer portal
          from there to update your payment method or cancel. You can resubscribe from{' '}
          <Link href="/pricing" className={linkClass}>
            Pricing
          </Link>{' '}
          whenever you like.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          Can I listen offline or download episodes?
        </h2>
        <p>
          Today, {BRAND.productName} is built for streaming in the browser. Listening
          generally requires an internet connection; we do not offer a built-in
          download or offline mode for listeners yet. If that matters for your family,
          tell us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>
          —it helps us prioritize.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          Which devices are supported?
        </h2>
        <p>
          Use a recent version of a common browser on desktop, tablet, or phone. When
          you are signed in, you can access your membership from any device where you
          log in.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          How do saved favorites work?
        </h2>
        <p>
          After you sign up or log in, you can save stories from the library so they
          are easy to find later. Saves are tied to your account.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          Is content appropriate for children?
        </h2>
        <p>
          We aim for cozy, family-friendly adventures, but every household is
          different. A parent or guardian should preview stories and supervise
          listening choices. For how we handle children&apos;s data when applicable,
          see our{' '}
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>{' '}
          (including the section on children&apos;s privacy).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          Who processes sign-in?
        </h2>
        <p>
          Sign-in is handled through our app using email and password, and optionally{' '}
          <strong>Google</strong> when that provider is enabled for our deployment.
          Session cookies help keep you signed in securely.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          How do I get help?
        </h2>
        <p>
          Email us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>
          . We do not have a contact form on the site yet; email is the best way to
          reach us for billing, content, or accessibility questions.
        </p>
      </section>
    </main>
  );
}
