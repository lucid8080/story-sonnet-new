import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin.js';
import { useAuth } from '../../hooks/useAuth.js';

export default function SiteHeader() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-7 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-200">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-slate-900">Story Sonnet</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Story worlds made for listening
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `hidden rounded-full px-3 py-1.5 sm:inline-flex ${
                isActive ? 'bg-slate-900 text-slate-50' : 'hover:bg-slate-100'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 ${
                isActive ? 'bg-rose-500 text-white' : 'hover:bg-rose-50 text-rose-600'
              }`
            }
          >
            Pricing
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `hidden rounded-full px-3 py-1.5 sm:inline-flex ${
                  isActive ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                }`
              }
            >
              Admin
            </NavLink>
          )}

          <div className="h-6 w-px bg-slate-200" />

          {user ? (
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50 shadow-sm shadow-slate-400/40"
            >
              <span className="hidden sm:inline">Account</span>
              <span className="inline sm:hidden">You</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                to="/signup"
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

