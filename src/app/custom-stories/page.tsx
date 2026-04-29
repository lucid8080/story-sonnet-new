import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { CUSTOM_STORY_PACKAGE_CONFIG, formatUsdFromCents } from '@/lib/custom-stories/config';

export const metadata: Metadata = {
  title: `Custom Stories | ${BRAND.productName}`,
  description: 'Create a personalized audio story for your child in a guided flow with short, 5-minute episodes.',
};

const faq = [
  {
    q: 'How long is each episode?',
    a: 'Every episode is designed to stay within 5 minutes so stories stay perfect for bedtime and short listening moments.',
  },
  {
    q: 'Can I request specific details?',
    a: 'Yes. The guided builder asks for your child, story world, lesson, characters, and tone with simple defaults.',
  },
  {
    q: 'Do I need an account?',
    a: 'You can browse and build without logging in. We only ask you to sign in before checkout.',
  },
  {
    q: 'Can I download the story?',
    a: 'Yes. Packages include downloadable MP3 audio, and cover downloads are available for custom stories.',
  },
];

export default function CustomStoriesMarketingPage() {
  return (
    <main className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/50 to-sky-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
            Personalized audio stories
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Create a personalized audio story for your child
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            Turn your child into the hero of a cozy adventure in minutes. You share a few details, and we build a story
            made just for them.
          </p>
          <Link
            href="/custom-stories/create"
            className="mt-6 inline-flex rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-rose-600"
          >
            Create Your Story
          </Link>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Demo Story</p>
            <div className="mt-4 rounded-2xl bg-slate-100 p-8 text-center text-slate-500">Cover Placeholder</div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="h-2 rounded-full bg-slate-200" />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>00:48</span>
                <span>04:30</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">Made for Maya, age 5</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How It Works</p>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              <li>1. Tell us about your child</li>
              <li>2. We create the story instantly</li>
              <li>3. Listen, download, or turn it into a tap-to-play card</li>
            </ol>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100 sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">Packages</h2>
          <p className="mt-2 text-sm text-slate-600">All packages include episodes with a maximum length of 5 minutes each.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {Object.entries(CUSTOM_STORY_PACKAGE_CONFIG).map(([key, pkg]) => (
              <article key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-lg font-bold text-slate-900">{pkg.label}</h3>
                <p className="mt-1 text-sm font-semibold text-rose-600">
                  {pkg.perEpisodeCents
                    ? `${formatUsdFromCents(pkg.basePriceCents)} for ${pkg.defaultEpisodeCount} episodes + ${formatUsdFromCents(pkg.perEpisodeCents)} per extra episode`
                    : `${formatUsdFromCents(pkg.basePriceCents)} total`}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {pkg.features.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
          <h2 className="text-2xl font-black text-slate-900">Tap-to-Play NFC Card</h2>
          <p className="mt-3 text-sm text-slate-600">
            Turn your story into a real tap-to-play card. Tap once and your child&apos;s story starts right away on your device.
          </p>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
          <h2 className="text-2xl font-black text-slate-900">FAQ</h2>
          <div className="mt-4 space-y-4">
            {faq.map((entry) => (
              <article key={entry.q} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">{entry.q}</h3>
                <p className="mt-1 text-sm text-slate-600">{entry.a}</p>
              </article>
            ))}
          </div>
          <Link
            href="/custom-stories/create"
            className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800"
          >
            Start Building
          </Link>
        </section>
      </div>
    </main>
  );
}
