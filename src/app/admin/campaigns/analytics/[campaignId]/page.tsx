'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CampaignAnalyticsDetailPage() {
  const params = useParams();
  const campaignId = String(params.campaignId ?? '');
  const [item, setItem] = useState<unknown>(null);

  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/campaign-analytics/${campaignId}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Failed');
        setItem(j);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    })();
  }, [campaignId]);

  return (
    <div>
      <Link href="/admin/campaigns/analytics" className="text-sm font-semibold text-violet-600">
        ← Analytics
      </Link>
      <pre className="mt-4 max-h-[70vh] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-100">
        {JSON.stringify(item, null, 2)}
      </pre>
    </div>
  );
}
