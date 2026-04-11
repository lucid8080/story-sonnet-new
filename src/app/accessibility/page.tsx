import type { Metadata } from 'next';

import { BRAND } from '@/lib/brand';

const SUPPORT_EMAIL = 'support@sozoplay.com';

function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return 'https://sozoplay.com';
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).origin;
  } catch {
    return 'https://sozoplay.com';
  }
}

const linkClass =
  'font-medium text-primary underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm';

export const metadata: Metadata = {
  title: `Accessibility | ${BRAND.productName}`,
  description: `How ${BRAND.productName} approaches accessibility and how to reach us with feedback.`,
};

export default function AccessibilityPage() {
  const siteOrigin = getSiteOrigin();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-neutral-800">
      <h1 className="mb-6 text-3xl font-bold text-neutral-900">Accessibility</h1>

      <p className="mb-6">Last updated: April 10, 2026</p>

      <p className="mb-10">
        <strong>Sozo Play</strong> is built for families who listen together. We want
        people to browse the library, play stories, and manage accounts without
        unnecessary barriers. This page describes how we think about accessibility
        today and how you can help us improve.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          1. What we strive for
        </h2>
        <p className="mb-4">
          We do not claim full conformance with any specific standard (such as WCAG
          2.1) across every screen or workflow until we have completed a formal audit.
          In the meantime, we focus on practical improvements, including:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Keyboard use and focus:</strong> Interactive controls should be
            reachable with the keyboard where we provide them, with visible focus
            indicators that match our design system.
          </li>
          <li>
            <strong>Structure and labels:</strong> We aim for clear headings and
            descriptive labels on core flows so assistive technologies can navigate
            the experience more predictably.
          </li>
          <li>
            <strong>Contrast and readability:</strong> We aim for readable text and
            sufficient contrast on primary UI where we control styling.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          2. Audio-first listening
        </h2>
        <p className="mb-4">
          The heart of Sozo Play is audio storytelling. Playback controls are
          designed to be discoverable and operable alongside the listening experience.
        </p>
        <p>
          Where we provide them for a given story or episode, you may also open a{' '}
          <strong>transcript</strong> to read along with playback. Transcripts are not
          guaranteed for every title; if something is missing or hard to use, please
          tell us using the contact information below.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          3. Third-party experiences
        </h2>
        <p className="mb-4">
          Some parts of the Service are provided by partners and may follow their own
          interfaces and accessibility practices—for example:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Stripe</strong> for checkout and billing. See Stripe&apos;s
            accessibility information:{' '}
            <a
              href="https://stripe.com/accessibility"
              className={linkClass}
              rel="noopener noreferrer"
            >
              stripe.com/accessibility
            </a>
            .
          </li>
          <li>
            <strong>Google</strong> when Google sign-in is enabled for a deployment.
            See Google&apos;s accessibility commitments and product documentation for
            the sign-in experience you use.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          4. Limitations and ongoing work
        </h2>
        <p>
          New features may take time to reach the same level of polish as established
          flows. If you run into a barrier—keyboard traps, missing labels, confusing
          focus order, or anything else—we want to hear about it so we can prioritize a
          fix.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">5. Contact us</h2>
        <p className="mb-4">
          Send accessibility feedback or questions to{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>
          . Please include the page or screen, your browser and assistive technology if
          relevant, and what you were trying to do. We will respond as promptly as we
          can.
        </p>
        <p>
          Website:{' '}
          <a href={siteOrigin} className={linkClass}>
            {siteOrigin}
          </a>
        </p>
      </section>
    </main>
  );
}
