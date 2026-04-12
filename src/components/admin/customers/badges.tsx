import { clsx } from 'clsx';

export function AccountStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    suspended: 'bg-amber-50 text-amber-900 ring-amber-100',
    banned: 'bg-rose-50 text-rose-800 ring-rose-100',
    pending: 'bg-slate-100 text-slate-700 ring-slate-200',
    deleted: 'bg-neutral-200 text-neutral-700 ring-neutral-300',
  };
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
        map[status] ?? 'bg-slate-50 text-slate-700 ring-slate-100'
      )}
    >
      {status}
    </span>
  );
}

export function PlanBadge({
  subscriptionStatus,
  plan,
}: {
  subscriptionStatus: string;
  plan: string | null;
}) {
  const label = plan?.trim() || subscriptionStatus;
  const isPaying =
    subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
        isPaying
          ? 'bg-violet-50 text-violet-800 ring-violet-100'
          : 'bg-slate-50 text-slate-600 ring-slate-100'
      )}
    >
      {label}
    </span>
  );
}
