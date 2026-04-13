'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Settings = {
  defaultTimezone: string;
  defaultCampaignPriority: number;
  allowMultipleTopBars: boolean;
  globalKillSwitch: boolean;
  testModeEnabled: boolean;
  testModeUserIdsJson: unknown;
  previewHeaderName: string;
  previewHeaderSecret: string | null;
  defaultBarDismissPolicy: string;
  promosCanStackWithTrials: boolean;
};

export default function CampaignSettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [testIds, setTestIds] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/campaign-settings');
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Failed');
        setS(j.settings);
        const arr = Array.isArray(j.settings.testModeUserIdsJson)
          ? j.settings.testModeUserIdsJson
          : [];
        setTestIds(arr.filter((x: unknown) => typeof x === 'string').join('\n'));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    })();
  }, []);

  async function save() {
    if (!s) return;
    try {
      const testModeUserIds = testIds
        .split(/[\n,]+/)
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/campaign-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultTimezone: s.defaultTimezone,
          defaultCampaignPriority: s.defaultCampaignPriority,
          allowMultipleTopBars: s.allowMultipleTopBars,
          globalKillSwitch: s.globalKillSwitch,
          testModeEnabled: s.testModeEnabled,
          testModeUserIds,
          previewHeaderName: s.previewHeaderName,
          previewHeaderSecret: s.previewHeaderSecret,
          defaultBarDismissPolicy: s.defaultBarDismissPolicy,
          promosCanStackWithTrials: s.promosCanStackWithTrials,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Save failed');
      toast.success('Settings saved');
      setS(j.settings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  }

  if (!s) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Default timezone</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={s.defaultTimezone}
          onChange={(e) => setS({ ...s, defaultTimezone: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Default campaign priority</span>
        <input
          type="number"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={s.defaultCampaignPriority}
          onChange={(e) => setS({ ...s, defaultCampaignPriority: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={s.allowMultipleTopBars}
          onChange={(e) => setS({ ...s, allowMultipleTopBars: e.target.checked })}
        />
        Allow multiple top notification bars
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-rose-700">
        <input
          type="checkbox"
          checked={s.globalKillSwitch}
          onChange={(e) => setS({ ...s, globalKillSwitch: e.target.checked })}
        />
        Global kill switch (hides all public campaigns)
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={s.testModeEnabled}
          onChange={(e) => setS({ ...s, testModeEnabled: e.target.checked })}
        />
        Test mode (only listed user IDs see campaigns)
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Test user IDs (one per line)</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          rows={4}
          value={testIds}
          onChange={(e) => setTestIds(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Preview header name</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={s.previewHeaderName}
          onChange={(e) => setS({ ...s, previewHeaderName: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Preview header secret (optional)</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={s.previewHeaderSecret ?? ''}
          onChange={(e) => setS({ ...s, previewHeaderSecret: e.target.value || null })}
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Default bar dismiss policy</span>
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={s.defaultBarDismissPolicy}
          onChange={(e) => setS({ ...s, defaultBarDismissPolicy: e.target.value })}
        >
          <option value="session">session</option>
          <option value="hours_24">24 hours</option>
          <option value="days_7">7 days</option>
          <option value="until_campaign_end">until campaign ends</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={s.promosCanStackWithTrials}
          onChange={(e) => setS({ ...s, promosCanStackWithTrials: e.target.checked })}
        />
        Promos can stack with trials (resolver hint; enforce in checkout later)
      </label>
      <button
        type="button"
        onClick={() => void save()}
        className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white"
      >
        Save settings
      </button>
    </div>
  );
}
