import Link from 'next/link';
import prisma from '@/lib/prisma';

type SpotlightListRow = {
  id: string;
  internalName: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  startAt: Date;
  endAt: Date;
  featureOnHomepage: boolean;
  featureOnLibraryPage: boolean;
  priority: number;
};

export default async function AdminSpotlightsListPage() {
  let rows: SpotlightListRow[] = [];
  if (process.env.DATABASE_URL) {
    try {
      rows = await prisma.contentSpotlight.findMany({
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          internalName: true,
          title: true,
          slug: true,
          status: true,
          type: true,
          startAt: true,
          endAt: true,
          featureOnHomepage: true,
          featureOnLibraryPage: true,
          priority: true,
          updatedAt: true,
        },
      });
    } catch {
      rows = [];
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Placements</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.internalName}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.type}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {r.startAt.toISOString().slice(0, 10)} →{' '}
                  {r.endAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {r.featureOnHomepage ? 'Home ' : ''}
                  {r.featureOnLibraryPage ? 'Library' : ''}
                  {!r.featureOnHomepage && !r.featureOnLibraryPage ? '—' : ''}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.priority}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/content-calendar/spotlights/${r.id}/edit`}
                    className="text-teal-700 font-semibold hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No spotlights yet. Create one or run the database seed.
          </p>
        ) : null}
      </div>
    </div>
  );
}
