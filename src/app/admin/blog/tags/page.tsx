'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { normalizeBlogSlug, slugifyBlogTitle } from '@/lib/blog/slug';

type Tag = { id: string; name: string; slug: string };

export default function AdminBlogTagsPage() {
  const [items, setItems] = useState<Tag[]>([]);
  const [name, setName] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/blog/tags');
    const data = (await res.json()) as { items?: Tag[] };
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
      <h1 className="mt-4 text-2xl font-black text-slate-900">Tags</h1>
      <form
        className="mt-6 flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const slug = normalizeBlogSlug(slugifyBlogTitle(name));
          const res = await fetch('/api/admin/blog/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, slug }),
          });
          if (res.ok) {
            toast.success('Created');
            setName('');
            void load();
          } else toast.error('Failed');
        }}
      >
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add
        </button>
      </form>
      <ul className="mt-8 flex flex-wrap gap-2">
        {items.map((t) => (
          <li
            key={t.id}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
          >
            {t.name}
            <button
              type="button"
              className="text-red-600"
              onClick={async () => {
                if (!confirm('Delete tag?')) return;
                await fetch(`/api/admin/blog/tags/${t.id}`, { method: 'DELETE' });
                void load();
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
