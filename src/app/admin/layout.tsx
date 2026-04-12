import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { auth } from '@/auth';
import { AdminTopNav } from '@/components/admin/AdminTopNav';

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
        <AdminTopNav />
      </div>
      <div className="mx-auto max-w-[90rem] px-6 py-8">{children}</div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
