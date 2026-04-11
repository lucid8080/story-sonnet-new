import Link from 'next/link';
import { BRAND } from '@/lib/brand';

type Props = {
  title: string;
  description: string;
};

export default function MarketingPlaceholder({ title, description }: Props) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      <p className="text-sm leading-relaxed text-neutral-700">{description}</p>
      <p className="text-xs text-neutral-500">
        This page is a placeholder while we finish the full content for{' '}
        {BRAND.productName}.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
        <Link
          href="/"
          className="rounded-lg text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          Home
        </Link>
        <Link
          href="/library"
          className="rounded-lg text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          Library
        </Link>
        <Link
          href="/contact"
          className="rounded-lg text-neutral-700 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          Contact
        </Link>
      </div>
    </main>
  );
}
