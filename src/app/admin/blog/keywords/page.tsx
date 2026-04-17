'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Kw = {
  id: string;
  keyword: string;
  status: string;
  priority: string;
  assignedTopicTitle: string | null;
  assignedPost: { id: string; title: string; slug: string } | null;
  category: { name: string } | null;
  updatedAt: string;
};

export default function AdminBlogKeywordsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Kw[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [rawImport, setRawImport] = useState('');
  const [single, setSingle] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/blog/keywords');
    const data = (await res.json()) as {
      items?: Kw[];
      stats?: Record<string, number>;
    };
    setItems(data.items ?? []);
    setStats(data.stats ?? {});
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <Link href="/admin/blog" className="text-sm font-semibold text-violet-600 hover:underline">
        ← Blog posts
      </Link>
      <h1 className="mt-4 text-2xl font-black text-slate-900">Keyword bank</h1>
      <p className="mt-1 text-sm text-slate-600">
        Track SEO keywords, generate topics, and open drafts.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {['UNUSED', 'TOPIC_CREATED', 'DRAFT_CREATED', 'PUBLISHED', 'SKIPPED'].map(
          (s) => (
            <div
              key={s}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs"
            >
              <div className="font-bold text-slate-400">{s}</div>
              <div className="text-lg font-black text-slate-900">
                {stats[s] ?? 0}
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Add keyword</h2>
          <form
            className="mt-2 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/blog/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: single }),
              });
              if (res.ok) {
                toast.success('Added');
                setSingle('');
                void load();
              } else {
                const err = (await res.json()) as { error?: string };
                toast.error(err.error ?? 'Failed');
              }
            }}
          >
            <input
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={single}
              onChange={(e) => setSingle(e.target.value)}
              placeholder="keyword phrase"
            />
            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add
            </button>
          </form>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">Bulk import</h2>
          <textarea
            className="mt-2 min-h-[100px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={rawImport}
            onChange={(e) => setRawImport(e.target.value)}
            placeholder="Paste keywords (comma or newline separated)"
          />
          <button
            type="button"
            className="mt-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            onClick={async () => {
              const res = await fetch('/api/admin/blog/keywords/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw: rawImport }),
              });
              const data = (await res.json()) as {
                created?: number;
                skipped?: number;
              };
              if (res.ok) {
                toast.success(
                  `Imported ${data.created ?? 0}, skipped ${data.skipped ?? 0}`
                );
                setRawImport('');
                void load();
              }
            }}
          >
            Import
          </button>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Keyword</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Post</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((k) => (
              <tr key={k.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{k.keyword}</td>
                <td className="px-4 py-3 text-slate-600">{k.status}</td>
                <td className="px-4 py-3">
                  {k.assignedPost ? (
                    <button
                      type="button"
                      className="text-violet-600 hover:underline"
                      onClick={() => router.push(`/admin/blog/${k.assignedPost!.id}`)}
                    >
                      {k.assignedPost.title}
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    type="button"
                    className="text-xs text-violet-600 hover:underline"
                    onClick={async () => {
                      const res = await fetch(
                        '/api/admin/blog/keywords/generate-topics',
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ keywordId: k.id }),
                        }
                      );
                      const data = (await res.json()) as {
                        topics?: { title: string }[];
                      };
                      if (res.ok && data.topics) {
                        toast.success(
                          `Generated ${data.topics.length} ideas (see toast log)`
                        );
                        console.log(data.topics);
                      } else toast.error('Failed');
                      void load();
                    }}
                  >
                    Topics
                  </button>
                  <button
                    type="button"
                    className="text-xs text-violet-600 hover:underline"
                    onClick={async () => {
                      const res = await fetch(
                        '/api/admin/blog/keywords/generate-draft',
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            keywordId: k.id,
                            generateImage: false,
                          }),
                        }
                      );
                      const data = (await res.json()) as { post?: { id: string } };
                      if (res.ok && data.post?.id) {
                        toast.success('Draft created');
                        router.push(`/admin/blog/${data.post.id}`);
                      } else toast.error('Failed');
                    }}
                  >
                    Draft
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
