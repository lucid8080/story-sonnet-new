'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ResolvedCampaignPayload } from '@/lib/campaigns/types';
import { CampaignBarRenderer } from './CampaignBarRenderer';

function pickBarPayload(
  items: ResolvedCampaignPayload[] | undefined
): ResolvedCampaignPayload | null {
  if (!items?.length) return null;
  const hit = items.find(
    (p) => p.kind === 'notification_bar' || p.kind === 'trial_offer'
  );
  return hit ?? null;
}

/** Client-loaded global top bar — keeps auth/DB off the root layout SSR path. */
export function ActiveCampaignBarClient() {
  const pathname = usePathname();
  const [payload, setPayload] = useState<ResolvedCampaignPayload | null>(null);

  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      setPayload(null);
      return;
    }

    let cancelled = false;
    const q = new URLSearchParams({
      placement: 'global_top_bar',
      pathname,
      types: 'notification_bar,trial_offer',
    });
    fetch(`/api/campaigns/resolve?${q}`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as {
          ok?: boolean;
          items?: ResolvedCampaignPayload[];
        };
        return data.ok ? pickBarPayload(data.items) : null;
      })
      .then((p) => {
        if (!cancelled) setPayload(p);
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (
    !payload ||
    (payload.kind !== 'notification_bar' && payload.kind !== 'trial_offer')
  ) {
    return null;
  }

  return <CampaignBarRenderer payload={payload} />;
}
