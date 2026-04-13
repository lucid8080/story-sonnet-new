'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin/content-calendar', label: 'Calendar' },
  { href: '/admin/content-calendar/spotlights', label: 'Spotlights' },
  { href: '/admin/content-calendar/badge-assets', label: 'Badge assets' },
  { href: '/admin/content-calendar/placements', label: 'Placements' },
  { href: '/admin/content-calendar/preview', label: 'Preview' },
  { href: '/admin/content-calendar/settings', label: 'Settings' },
];

export function ContentCalendarSubNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-xs font-semibold text-slate-600">
      {links.map((l) => {
        const active =
          l.href === '/admin/content-calendar'
            ? pathname === '/admin/content-calendar'
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? 'rounded-full bg-teal-600 px-3 py-1.5 text-white'
                : 'rounded-full px-3 py-1.5 hover:bg-slate-100'
            }
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href="/admin/content-calendar/spotlights/new"
        className="ml-auto rounded-full bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
      >
        New spotlight
      </Link>
    </div>
  );
}
