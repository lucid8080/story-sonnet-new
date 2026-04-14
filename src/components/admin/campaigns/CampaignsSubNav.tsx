'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin/campaigns', label: 'Overview' },
  { href: '/admin/campaigns/notification-bars', label: 'Notification Bars' },
  { href: '/admin/campaigns/free-trials', label: 'Free Trials' },
  { href: '/admin/campaigns/promo-codes', label: 'Promo Codes' },
  { href: '/admin/campaigns/placements', label: 'Placements' },
  { href: '/admin/campaigns/analytics', label: 'Analytics' },
  { href: '/admin/campaigns/settings', label: 'Settings' },
];

export function CampaignsSubNav() {
  const pathname = usePathname();
  const isFreeTrials = pathname === '/admin/campaigns/free-trials';
  const isPromoCodes = pathname === '/admin/campaigns/promo-codes';
  const newHref = isFreeTrials
    ? '/admin/campaigns/new?type=trial_offer'
    : isPromoCodes
      ? '/admin/campaigns/new?type=promo_code'
      : '/admin/campaigns/new?type=notification_bar';
  const newLabel = isFreeTrials
    ? 'New free trial'
    : isPromoCodes
      ? 'New promo code'
      : 'New notification bar';
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-xs font-semibold text-slate-600">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? 'rounded-full bg-violet-600 px-3 py-1.5 text-white'
                : 'rounded-full px-3 py-1.5 hover:bg-slate-100'
            }
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href={newHref}
        className="ml-auto rounded-full bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
      >
        {newLabel}
      </Link>
    </div>
  );
}
