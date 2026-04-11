import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/login?callbackUrl=/admin');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 text-sm font-semibold text-slate-700">
          <Link href="/admin" className="hover:text-violet-600">
            Dashboard
          </Link>
          <Link href="/admin/stories" className="hover:text-violet-600">
            Stories
          </Link>
          <Link href="/admin/uploads" className="hover:text-violet-600">
            Uploads
          </Link>
          <Link href="/admin/story-studio" className="hover:text-violet-600">
            Story Studio
          </Link>
          <Link href="/" className="ml-auto text-slate-500 hover:text-slate-800">
            View site
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-[90rem] px-6 py-8">{children}</div>
    </div>
  );
}
