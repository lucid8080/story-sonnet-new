import PricingActions from './PricingActions';
import { BRAND } from '@/lib/brand';

export default function PricingPage() {
  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-0">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-500 shadow-sm ring-1 ring-rose-100">
            {BRAND.planName}
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            One simple plan for cozy story time
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Keep the free stories, and unlock premium adventures when you&apos;re
            ready. You can cancel anytime.
          </p>
        </div>
        <PricingActions />
      </div>
    </div>
  );
}
