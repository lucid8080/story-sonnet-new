import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="text-2xl font-black text-slate-900">Checkout canceled</h1>
      <p className="mt-3 text-sm text-slate-600">
        No worries—you can subscribe anytime from the pricing page.
      </p>
      <Link
        href="/pricing"
        className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
      >
        View pricing
      </Link>
    </div>
  );
}
