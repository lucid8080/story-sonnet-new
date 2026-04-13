'use client';

import type { ResolvedCampaignPayload } from '@/lib/campaigns/types';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useActiveCampaigns(
  placement: string,
  opts?: { types?: string }
): { items: ResolvedCampaignPayload[] | null; loading: boolean; error: string | null } {
  const pathname = usePathname() || '/';
  const [items, setItems] = useState<ResolvedCampaignPayload[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          placement,
          pathname,
        });
        if (opts?.types) qs.set('types', opts.types);
        const res = await fetch(`/api/campaigns/resolve?${qs}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Resolve failed');
        if (!cancelled) setItems(j.items ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [placement, pathname, opts?.types]);

  return { items, loading, error };
}
