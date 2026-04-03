import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-slate-50 via-white to-violet-50">
      <div className="mx-auto flex max-w-6xl gap-6 px-5 py-8 sm:px-7 lg:px-8">
        <aside className="hidden w-56 flex-shrink-0 rounded-3xl bg-white p-4 shadow-lg shadow-slate-200 ring-1 ring-slate-100 md:block">
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Admin
          </h2>
          <nav className="mt-4 space-y-1 text-sm font-medium text-slate-600">
            <AdminNavLink to="/admin">Dashboard</AdminNavLink>
            <AdminNavLink to="/admin/stories">Stories</AdminNavLink>
            <AdminNavLink to="/admin/uploads">Uploads</AdminNavLink>
          </nav>
        </aside>

        <main className="flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Story Sonnet Admin
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Manage stories, episodes, and uploads. Admin roles are managed in Supabase.
              </p>
            </div>
            <Link
              to="/"
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-50"
            >
              Back to stories
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200 ring-1 ring-slate-100">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-xl px-3 py-2 ${
          isActive
            ? 'bg-slate-900 text-slate-50'
            : 'hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

