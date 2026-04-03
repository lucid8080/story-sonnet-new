import Link from 'next/link';

export default function BillingSuccessPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="text-2xl font-black text-slate-900">You&apos;re subscribed!</h1>
      <p className="mt-3 text-sm text-slate-600">
        Thanks for supporting Story Sonnet. Premium stories will unlock on your
        account shortly.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white"
      >
        Back to stories
      </Link>
    </div>
  );
}
