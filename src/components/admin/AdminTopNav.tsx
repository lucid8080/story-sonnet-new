'use client';

import Link from 'next/link';
import { AdminNotificationBell } from './AdminNotificationBell';

export function AdminTopNav() {
  return (
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 text-sm font-semibold text-slate-700">
      <Link href="/admin" className="hover:text-violet-600">
        Dashboard
      </Link>
      <Link href="/admin/customers" className="hover:text-violet-600">
        Customers
      </Link>
      <Link href="/admin/stories" className="hover:text-violet-600">
        Stories
      </Link>
      <Link href="/admin/uploads" className="hover:text-violet-600">
        Uploads
      </Link>
      <Link href="/admin/story-studio" className="hover:text-violet-600">
        Story Studio
      </Link>
      <Link href="/admin/campaigns" className="hover:text-violet-600">
        {'Campaigns & Offers'}
      </Link>
      <Link href="/admin/content-calendar" className="hover:text-violet-600">
        Content Calendar
      </Link>
      <Link href="/admin/blog" className="hover:text-violet-600">
        Blog
      </Link>
      <Link href="/admin/settings/generation" className="hover:text-violet-600">
        Settings
      </Link>
      <span className="ml-auto flex items-center gap-1">
        <AdminNotificationBell />
        <Link href="/" className="pl-2 text-slate-500 hover:text-slate-800">
          View site
        </Link>
      </span>
    </nav>
  );
}
