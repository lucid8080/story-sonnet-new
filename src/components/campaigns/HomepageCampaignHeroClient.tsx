'use client';

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

/** Homepage hero campaign slot — client fetch to avoid SSR auth/DB on `/`. */
export function HomepageCampaignHeroClient() {
  const [payload, setPayload] = useState<ResolvedCampaignPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({
      placement: 'homepage_hero',
      pathname: '/',
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
  }, []);

  if (
    !payload ||
    (payload.kind !== 'notification_bar' && payload.kind !== 'trial_offer')
  ) {
    return null;
  }

  return (
    <div className="mb-6">
      <CampaignBarRenderer payload={payload} analyticsPlacement="homepage_hero" />
    </div>
  );
}
