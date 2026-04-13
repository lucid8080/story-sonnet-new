'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ContentCalendarSettingsPage() {
  const [raw, setRaw] = useState('{}');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/content-calendar/settings');
    const j = await res.json();
    if (j.ok) {
      setRaw(JSON.stringify(j.settings.data ?? {}, null, 2));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      toast.error('Invalid JSON');
      return;
    }
    const res = await fetch('/api/admin/content-calendar/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (res.ok) toast.success('Saved');
    else toast.error('Save failed');
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Calendar settings (JSON)</h2>
      <p className="text-sm text-slate-600">
        Optional defaults for the admin UI (e.g. default IANA timezone label). Safe
        to leave empty.
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={14}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs"
      />
      <button
        type="button"
        onClick={() => void save()}
        className="rounded-full bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-500"
      >
        Save settings
      </button>
    </div>
  );
}
