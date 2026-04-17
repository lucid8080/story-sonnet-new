'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { normalizeBlogSlug, slugifyBlogTitle } from '@/lib/blog/slug';

type Cat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export default function AdminBlogCategoriesPage() {
  const [items, setItems] = useState<Cat[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/blog/categories');
    const data = (await res.json()) as { items?: Cat[] };
    setItems(data.items ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <Link href="/admin/blog" className="text-sm font-semibold text-violet-600 hover:underline">
        ← Blog posts
      </Link>
      <h1 className="mt-4 text-2xl font-black text-slate-900">Categories</h1>
      <form
        className="mt-6 flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch('/api/admin/blog/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              slug: slug
                ? normalizeBlogSlug(slug)
                : normalizeBlogSlug(slugifyBlogTitle(name)),
            }),
          });
          if (res.ok) {
            toast.success('Created');
            setName('');
            setSlug('');
            void load();
          } else toast.error('Failed');
        }}
      >
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="slug (optional)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add
        </button>
      </form>
      <ul className="mt-8 space-y-2">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <span>
              <span className="font-semibold">{c.name}</span>{' '}
              <code className="text-xs text-slate-500">{c.slug}</code>
            </span>
            <button
              type="button"
              className="text-red-600 hover:underline"
              onClick={async () => {
                if (!confirm('Delete category?')) return;
                await fetch(`/api/admin/blog/categories/${c.id}`, { method: 'DELETE' });
                void load();
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
