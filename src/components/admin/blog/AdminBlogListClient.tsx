'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Row = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
  isFeatured: boolean;
  category: { name: string } | null;
};

export function AdminBlogListClient() {
  const router = useRouter();
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const qRef = useRef(q);

  const load = useCallback(async (nextQ: string, nextStatus: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextQ.trim()) params.set('q', nextQ.trim());
      if (nextStatus !== 'all') params.set('status', nextStatus);
      const res = await fetch(`/api/admin/blog?${params.toString()}`);
      const data = (await res.json()) as { items?: Row[]; total?: number };
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    qRef.current = q;
  }, [q]);

  useEffect(() => {
    void load(qRef.current, status);
  }, [load, status]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Blog posts</h1>
          <p className="text-sm text-slate-600">{total} posts</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          New post
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Search…"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load(q, status)}
        />
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          onClick={() => void load(q, status)}
        >
          Search
        </button>
        <select
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Link
          href="/admin/blog/categories"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          Categories
        </Link>
        <Link
          href="/admin/blog/tags"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          Tags
        </Link>
        <Link
          href="/admin/blog/keywords"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          Keyword bank
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No posts yet. Create one to get started.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/admin/blog/${row.id}`} className="hover:underline">
                      {row.title}
                    </Link>
                    {row.isFeatured && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.status}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(row.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-xs text-violet-600 hover:underline"
                      onClick={async () => {
                        if (!confirm('Delete this post?')) return;
                        const res = await fetch(`/api/admin/blog/${row.id}`, {
                          method: 'DELETE',
                        });
                        if (res.ok) {
                          toast.success('Deleted');
                          void load(q, status);
                          router.refresh();
                        } else toast.error('Delete failed');
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
