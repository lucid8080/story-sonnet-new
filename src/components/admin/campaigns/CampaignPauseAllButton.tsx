'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export function CampaignPauseAllButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onPauseAll() {
    if (!window.confirm('Pause every active or scheduled campaign?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/campaigns/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause_all', confirm: 'yes' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      toast.success(`Paused ${data.affected ?? 0} campaigns.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Pause all failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onPauseAll}
      className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
    >
      {busy ? 'Pausing…' : 'Pause all campaigns'}
    </button>
  );
}
