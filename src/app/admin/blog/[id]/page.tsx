import Link from 'next/link';
import { AdminBlogEditor } from '@/components/admin/blog/AdminBlogEditor';

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/blog"
          className="text-sm font-semibold text-violet-600 hover:underline"
        >
          ← Back to posts
        </Link>
      </div>
      <AdminBlogEditor postId={id} />
    </div>
  );
}
