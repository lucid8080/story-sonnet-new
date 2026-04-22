'use client';

import { useEffect, useMemo, useState } from 'react';

type OptionItem = {
  compositeKey: string;
  displayLabel: string;
};

type Group = {
  provider: string;
  providerLabel: string;
  items: OptionItem[];
};

export function GenerationToolSelector({
  family,
  toolKey,
  label,
  className,
}: {
  family: 'text' | 'image' | 'audio_narration';
  toolKey:
    | 'story_studio_generate_brief'
    | 'story_studio_generate_script'
    | 'story_studio_generate_episode'
    | 'story_studio_generate_cover'
    | 'blog_generate_text'
    | 'blog_generate_image'
    | 'story_studio_narration';
  label: string;
  className?: string;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetch(`/api/admin/generation/options?family=${encodeURIComponent(family)}`),
      fetch('/api/admin/generation/preferences'),
    ])
      .then(async ([optionsRes, prefsRes]) => {
        const optionsJson = (await optionsRes.json()) as {
          ok?: boolean;
          groups?: Group[];
          error?: string;
        };
        const prefsJson = (await prefsRes.json()) as {
          preferences?: { toolKey: string; selectedCompositeKey: string | null }[];
        };
        if (!optionsRes.ok || !optionsJson.ok) {
          throw new Error(optionsJson.error || 'Could not load generation options');
        }
        if (cancelled) return;
        const nextGroups = optionsJson.groups ?? [];
        setGroups(nextGroups);
        const pref = prefsJson.preferences?.find((p) => p.toolKey === toolKey);
        const allKeys = new Set(
          nextGroups.flatMap((group) => group.items.map((item) => item.compositeKey))
        );
        if (pref?.selectedCompositeKey && allKeys.has(pref.selectedCompositeKey)) {
          setSelected(pref.selectedCompositeKey);
        } else {
          setSelected(nextGroups[0]?.items[0]?.compositeKey ?? '');
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load generation options');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [family, toolKey]);

  const hasOptions = useMemo(
    () => groups.some((group) => group.items.length > 0),
    [groups]
  );

  const onChange = async (next: string) => {
    setSelected(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/generation/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolKey, selectedCompositeKey: next }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Could not save selection');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save selection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Loading options…
        </div>
      ) : !hasOptions ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No enabled providers found for this tool.
        </div>
      ) : (
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
          value={selected}
          onChange={(e) => void onChange(e.target.value)}
          disabled={saving}
        >
          {groups.map((group) => (
            <optgroup key={group.provider} label={group.providerLabel}>
              {group.items.map((item) => (
                <option key={item.compositeKey} value={item.compositeKey}>
                  {item.displayLabel}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
      {saving && <p className="mt-1 text-[11px] text-slate-500">Saving default for this tool…</p>}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
