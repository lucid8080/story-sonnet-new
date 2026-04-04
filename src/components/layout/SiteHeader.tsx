'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

function NavLink({
  href,
  children,
  activeClass,
  idleClass,
}: {
  href: string;
  children: React.ReactNode;
  activeClass: string;
  idleClass: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={isActive ? activeClass : idleClass}
    >
      {children}
    </Link>
  );
}

export default function SiteHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === 'admin';

  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-7 lg:px-8">
        <Link href="/" className="flex items-center gap-1.5">
          <Image
            src="/branding/logo.png"
            alt="Story Sonnet"
            width={120}
            height={40}
            className="h-10 w-auto max-w-[120px] object-contain object-left"
            priority
          />
          <div>
            <div className="text-sm font-black tracking-tight text-slate-900">
              Story Sonnet
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Worlds made for listening
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <NavLink
            href="/library"
            activeClass="hidden rounded-full bg-rose-500 px-3 py-1.5 text-white sm:inline-flex"
            idleClass="hidden rounded-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 sm:inline-flex"
          >
            Library
          </NavLink>
          <NavLink
            href="/pricing"
            activeClass="rounded-full bg-rose-500 px-3 py-1.5 text-white"
            idleClass="rounded-full px-3 py-1.5 text-rose-600 hover:bg-rose-50"
          >
            Pricing
          </NavLink>
          {isAdmin && (
            <NavLink
              href="/admin"
              activeClass="hidden rounded-full bg-rose-500 px-3 py-1.5 text-white sm:inline-flex"
              idleClass="hidden rounded-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 sm:inline-flex"
            >
              Admin
            </NavLink>
          )}

          <div className="h-6 w-px bg-slate-200" />

          {user ? (
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50 shadow-sm shadow-slate-400/40"
            >
              <span className="hidden sm:inline">Account</span>
              <span className="inline sm:hidden">You</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50 shadow-sm shadow-slate-400/40"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
