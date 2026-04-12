'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type NotifItem = {
  id: string;
  type: string;
  createdAt: string;
  unread: boolean;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

function formatAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 45) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function labelForType(type: string): string {
  if (type === 'user_signup') return 'New signup';
  if (type === 'subscription_active') return 'Active plan';
  return type;
}

export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.ok) return;
      setUnreadCount(json.data.unreadCount ?? 0);
      setItems(json.data.items ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function markAllRead() {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) return;
      await load();
    } catch {
      /* ignore */
    }
  }

  const badge =
    unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {badge ? (
          <span className="absolute right-0 top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white py-2 shadow-lg ring-1 ring-black/5"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 pb-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Alerts
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-violet-600 hover:text-violet-800"
              onClick={() => void markAllRead()}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-4 text-sm text-slate-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/customers/${item.user.id}`}
                      className={
                        item.unread
                          ? 'block bg-violet-50/80 px-3 py-2.5 hover:bg-violet-50'
                          : 'block px-3 py-2.5 hover:bg-slate-50'
                      }
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {labelForType(item.type)}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        {item.user.name ?? item.user.email ?? item.user.id}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
