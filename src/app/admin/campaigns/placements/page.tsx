import prisma from '@/lib/prisma';
import { CAMPAIGN_PLACEMENT_KEYS } from '@/lib/validation/campaignSchemas';
import Link from 'next/link';

export default async function PlacementsMatrixPage() {
  let byPlacement: Record<string, { id: string; internalName: string; status: string }[]> = {};
  if (process.env.DATABASE_URL) {
    try {
      const rows = await prisma.campaign.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          internalName: true,
          status: true,
          placements: { select: { placement: true } },
        },
      });
      byPlacement = {};
      for (const k of CAMPAIGN_PLACEMENT_KEYS) {
        byPlacement[k] = [];
      }
      for (const c of rows) {
        for (const p of c.placements) {
          if (!byPlacement[p.placement]) byPlacement[p.placement] = [];
          byPlacement[p.placement].push({
            id: c.id,
            internalName: c.internalName,
            status: c.status,
          });
        }
      }
    } catch (e) {
      console.warn('[placements page]', e);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Each placement can host multiple campaigns; the site resolver applies priority, pin, and schedule
        rules.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {CAMPAIGN_PLACEMENT_KEYS.map((key) => (
          <div key={key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{key}</div>
            <ul className="mt-2 space-y-1 text-sm">
              {(byPlacement[key] ?? []).length ? (
                (byPlacement[key] ?? []).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <Link href={`/admin/campaigns/${c.id}/edit`} className="font-medium text-violet-700">
                      {c.internalName}
                    </Link>
                    <span className="text-xs text-slate-500">{c.status}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400">—</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
