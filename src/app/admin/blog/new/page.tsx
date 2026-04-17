'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminBlogNewPage() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/admin/blog', { method: 'POST' });
      const data = (await res.json()) as { post?: { id: string }; error?: string };
      if (cancelled) return;
      if (res.ok && data.post?.id) {
        router.replace(`/admin/blog/${data.post.id}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
      Creating draft…
    </div>
  );
}
