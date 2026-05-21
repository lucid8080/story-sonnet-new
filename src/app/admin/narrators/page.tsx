import NarratorsAdminClient from '@/components/admin/narrators/NarratorsAdminClient';

export default function AdminNarratorsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-black text-slate-900">Narrators</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Create voice talent profiles with avatars, then assign them to story
          series on the Stories admin page. Published assignments appear on each
          story page and the public narrators directory.
        </p>
      </header>
      <NarratorsAdminClient />
    </div>
  );
}
