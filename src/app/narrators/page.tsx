import { Suspense } from 'react';
import { fetchNarratorsDirectory } from '@/lib/narrators';
import { BRAND } from '@/lib/brand';
import { NarratorsDirectory } from '@/components/narrators/NarratorsDirectory';

export const metadata = {
  title: 'Narrators',
  description: 'Meet the voices behind our story series.',
};

export default async function NarratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ narrator?: string }>;
}) {
  const { narrator: highlightSlug } = await searchParams;
  const narrators = await fetchNarratorsDirectory();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-7 sm:py-14">
      <header className="mb-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-600">
          {BRAND.productName}
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
          Our narrators
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-slate-600">
          The voices who bring each series to life. Tap a card to see which
          stories they read.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="text-center text-sm text-slate-500">Loading narrators…</p>
        }
      >
        <NarratorsDirectory
          narrators={narrators}
          highlightSlug={highlightSlug ?? null}
        />
      </Suspense>
    </main>
  );
}
