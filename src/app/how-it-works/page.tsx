import type { Metadata } from 'next';
import Link from 'next/link';

import { BRAND } from '@/lib/brand';

const linkClass =
  'font-medium text-primary underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm';

export const metadata: Metadata = {
  title: `How it works | ${BRAND.productName}`,
  description: `Discover stories, listen by episode, save favorites, and unlock ${BRAND.planName} when you are ready.`,
};

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-neutral-800">
      <h1 className="mb-6 text-3xl font-bold text-neutral-900">How it works</h1>

      <p className="mb-10 text-lg leading-relaxed text-neutral-700">
        {BRAND.productName} is built for simple, calm listening: browse audio
        adventures, open a story, and press play. Here is the flow from discovery
        to membership.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          1. Discover stories
        </h2>
        <p className="mb-4">
          Start from the{' '}
          <Link href="/" className={linkClass}>
            home page
          </Link>{' '}
          story library—browse by cover tile and tap into anything that catches your
          eye. For more room to explore, open the full{' '}
          <Link href="/library" className={linkClass}>
            library
          </Link>
          , where you can sort the catalog and narrow things down with filters such
          as age, genre, and mood.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          2. Listen episode by episode
        </h2>
        <p>
          Each story has its own page with episodes you can play in order. Use the
          on-page player to start, pause, and move through the adventure at your own
          pace—perfect for bedtime, car rides, or quiet time at home.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          3. Save favorites (optional account)
        </h2>
        <p className="mb-4">
          You can listen without an account. When you{' '}
          <Link href="/signup" className={linkClass}>
            create an account
          </Link>{' '}
          or{' '}
          <Link href="/login" className={linkClass}>
            sign in
          </Link>
          , you can save stories to your list so they are easy to find later from the
          library.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          4. Free catalog and {BRAND.planName}
        </h2>
        <p className="mb-4">
          A selection of stories stays free to enjoy. When you are ready for more,
          the{' '}
          <Link href="/pricing" className={linkClass}>
            {BRAND.planName}
          </Link>{' '}
          unlocks premium listening. Checkout is handled securely through Stripe, and
          you can cancel whenever you need to—no long-term lock-in.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">5. Next steps</h2>
        <p className="mb-4">
          Jump into the{' '}
          <Link href="/library" className={linkClass}>
            library
          </Link>{' '}
          or review{' '}
          <Link href="/pricing" className={linkClass}>
            pricing
          </Link>{' '}
          when you want to upgrade. We are glad you are here for {BRAND.tagline.toLowerCase()}.
        </p>
      </section>
    </main>
  );
}
