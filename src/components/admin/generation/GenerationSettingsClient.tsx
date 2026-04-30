'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Family = 'text' | 'image' | 'audio_narration';
type Provider = 'openrouter' | 'openai' | 'elevenlabs';
type ToolKey =
  | 'story_studio_generate_brief'
  | 'story_studio_generate_script'
  | 'story_studio_generate_episode'
  | 'story_studio_generate_cover'
  | 'blog_generate_text'
  | 'blog_generate_image'
  | 'story_studio_narration';

type Option = {
  id: string;
  source: 'built_in' | 'custom';
  provider: Provider;
  providerLabel: string;
  vendorLabel: string | null;
  label: string;
  value: string;
  displayLabel: string;
  compositeKey: string;
  sortOrder: number;
};

const PROVIDERS_BY_FAMILY: Record<Family, Provider[]> = {
  text: ['openrouter', 'openai'],
  image: ['openrouter', 'openai'],
  audio_narration: ['elevenlabs'],
};

function providerLabel(provider: Provider): string {
  if (provider === 'openrouter') return 'OpenRouter';
  if (provider === 'openai') return 'OpenAI';
  return 'ElevenLabs';
}

const TOOL_LIST: { key: ToolKey; family: Family; label: string }[] = [
  { key: 'story_studio_generate_brief', family: 'text', label: 'Story Studio: Generate Brief' },
  { key: 'story_studio_generate_script', family: 'text', label: 'Story Studio: Generate Script' },
  { key: 'story_studio_generate_episode', family: 'text', label: 'Story Studio: Generate Episode' },
  { key: 'blog_generate_text', family: 'text', label: 'Blog: Generate Text' },
  { key: 'story_studio_generate_cover', family: 'image', label: 'Story Studio: Generate Cover' },
  { key: 'blog_generate_image', family: 'image', label: 'Blog: Generate Image' },
  { key: 'story_studio_narration', family: 'audio_narration', label: 'Story Studio: Narration' },
];

export function GenerationSettingsClient() {
  const [family, setFamily] = useState<Family>('text');
  const [providerFilter, setProviderFilter] = useState<'all' | Provider>('all');
  const [options, setOptions] = useState<Option[]>([]);
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [customStoriesGlobalEnabled, setCustomStoriesGlobalEnabled] = useState(false);
  const [savingGlobalToggle, setSavingGlobalToggle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    label: '',
    value: '',
    vendorLabel: '',
    sortOrder: 0,
    isEnabled: true,
  });
  const [form, setForm] = useState({
    family: 'text' as Family,
    provider: 'openrouter' as Provider,
    kind: 'model' as 'model' | 'voice',
    vendorLabel: '',
    label: '',
    value: '',
    sortOrder: 0,
  });

  const load = useCallback(async (nextFamily: Family) => {
    setLoading(true);
    const [optionsRes, prefsRes, settingsRes] = await Promise.all([
      fetch(`/api/admin/generation/options?family=${encodeURIComponent(nextFamily)}`),
      fetch('/api/admin/generation/preferences'),
      fetch('/api/admin/generation/settings'),
    ]);
    const optionsJson = (await optionsRes.json()) as {
      groups?: { items?: Option[] }[];
    };
    const prefsJson = (await prefsRes.json()) as {
      preferences?: { toolKey: string; selectedCompositeKey: string | null }[];
    };
    const settingsJson = (await settingsRes.json()) as {
      settings?: { customStoriesGlobalEnabled?: boolean };
    };
    const flat = (optionsJson.groups ?? []).flatMap((g) => g.items ?? []);
    setOptions(flat);
    const nextPrefs: Record<string, string> = {};
    (prefsJson.preferences ?? []).forEach((row) => {
      if (row.selectedCompositeKey) nextPrefs[row.toolKey] = row.selectedCompositeKey;
    });
    setPrefs(nextPrefs);
    setCustomStoriesGlobalEnabled(
      Boolean(settingsJson.settings?.customStoriesGlobalEnabled)
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(family);
  }, [family, load]);

  useEffect(() => {
    const allowed = PROVIDERS_BY_FAMILY[family];
    setForm((prev) => ({
      ...prev,
      family,
      provider: allowed.includes(prev.provider) ? prev.provider : allowed[0],
      kind: family === 'audio_narration' ? 'voice' : 'model',
    }));
  }, [family]);

  const visibleOptions = useMemo(() => {
    if (providerFilter === 'all') return options;
    return options.filter((opt) => opt.provider === providerFilter);
  }, [options, providerFilter]);

  const toolsForFamily = TOOL_LIST.filter((tool) => tool.family === family);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">
          Manage providers, models/voices, and default selections per generation tool.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase text-slate-600">Custom Stories</h2>
        <p className="mt-1 text-xs text-slate-500">
          Global default visibility for Custom Stories. Tagged users and admins can still access
          when disabled.
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={customStoriesGlobalEnabled}
            onChange={async (e) => {
              const next = e.target.checked;
              setCustomStoriesGlobalEnabled(next);
              setSavingGlobalToggle(true);
              try {
                const res = await fetch('/api/admin/generation/settings', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ customStoriesGlobalEnabled: next }),
                });
                if (!res.ok) {
                  setCustomStoriesGlobalEnabled((prev) => !prev);
                }
              } finally {
                setSavingGlobalToggle(false);
              }
            }}
          />
          Enable Custom Stories globally
        </label>
        {savingGlobalToggle ? (
          <p className="mt-2 text-xs text-slate-500">Saving...</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Family</span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={family}
            onChange={(e) => setFamily(e.target.value as Family)}
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="audio_narration">Audio narration</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Provider</span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as 'all' | Provider)}
          >
            <option value="all">All providers</option>
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase text-slate-600">Defaults Per Tool</h2>
        <div className="mt-3 grid gap-3">
          {toolsForFamily.map((tool) => (
            <label key={tool.key} className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-600">{tool.label}</span>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={prefs[tool.key] ?? ''}
                onChange={async (e) => {
                  const selectedCompositeKey = e.target.value;
                  await fetch('/api/admin/generation/preferences', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toolKey: tool.key, selectedCompositeKey }),
                  });
                  setPrefs((prev) => ({ ...prev, [tool.key]: selectedCompositeKey }));
                }}
              >
                {options.map((opt) => (
                  <option key={opt.compositeKey} value={opt.compositeKey}>
                    {opt.displayLabel}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase text-slate-600">Add Custom Option</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Provider
            </span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.provider}
              onChange={(e) =>
                setForm((f) => ({ ...f, provider: e.target.value as Provider }))
              }
            >
              {PROVIDERS_BY_FAMILY[family].map((provider) => (
                <option key={provider} value={provider}>
                  {providerLabel(provider)}
                </option>
              ))}
            </select>
          </label>
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={
              family === 'audio_narration' ? 'ElevenLabs voice ID' : 'Model ID value'
            }
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Vendor label (optional)"
            value={form.vendorLabel}
            onChange={(e) => setForm((f) => ({ ...f, vendorLabel: e.target.value }))}
          />
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              await fetch('/api/admin/generation/options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...form,
                  family,
                  provider: form.provider,
                  kind: family === 'audio_narration' ? 'voice' : 'model',
                  vendorLabel: form.vendorLabel || null,
                }),
              });
              setForm((f) => ({ ...f, label: '', value: '', vendorLabel: '' }));
              await load(family);
            }}
          >
            Add custom option
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase text-slate-600">Available Options</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        ) : visibleOptions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No options found for filters.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visibleOptions.map((opt) => (
              <li
                key={opt.compositeKey}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  {editingId === opt.id ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                        value={editForm.label}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, label: e.target.value }))
                        }
                        placeholder="Label"
                      />
                      <input
                        className="rounded-md border border-slate-200 px-2 py-1 font-mono text-xs"
                        value={editForm.value}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, value: e.target.value }))
                        }
                        placeholder="Model/Voice value"
                      />
                      <input
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                        value={editForm.vendorLabel}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, vendorLabel: e.target.value }))
                        }
                        placeholder="Vendor label (optional)"
                      />
                      <input
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                        type="number"
                        value={editForm.sortOrder}
                        onChange={(e) =>
                          setEditForm((s) => ({
                            ...s,
                            sortOrder: Number(e.target.value) || 0,
                          }))
                        }
                        placeholder="Sort order"
                      />
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={editForm.isEnabled}
                          onChange={(e) =>
                            setEditForm((s) => ({ ...s, isEnabled: e.target.checked }))
                          }
                        />
                        Enabled
                      </label>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-slate-900">{opt.displayLabel}</p>
                      <p className="font-mono text-xs text-slate-500">{opt.value}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      opt.source === 'built_in'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-violet-100 text-violet-800'
                    }`}
                  >
                    {opt.source === 'built_in' ? 'Built-in' : 'Custom'}
                  </span>
                  {opt.source === 'custom' && (
                    <>
                      {editingId === opt.id ? (
                        <>
                          <button
                            type="button"
                            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700"
                            onClick={async () => {
                              await fetch(
                                `/api/admin/generation/options/${encodeURIComponent(opt.id)}`,
                                {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    label: editForm.label.trim(),
                                    value: editForm.value.trim(),
                                    vendorLabel: editForm.vendorLabel.trim() || null,
                                    sortOrder: editForm.sortOrder,
                                    isEnabled: editForm.isEnabled,
                                  }),
                                }
                              );
                              setEditingId(null);
                              await load(family);
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="rounded-md border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700"
                          onClick={() => {
                            setEditingId(opt.id);
                            setEditForm({
                              label: opt.label,
                              value: opt.value,
                              vendorLabel: opt.vendorLabel ?? '',
                              sortOrder: opt.sortOrder ?? 0,
                              isEnabled: true,
                            });
                          }}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                        onClick={async () => {
                          await fetch(`/api/admin/generation/options/${encodeURIComponent(opt.id)}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isEnabled: false }),
                          });
                          await load(family);
                        }}
                      >
                        Disable
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `Delete "${opt.displayLabel}"? This permanently removes this custom option.`
                          );
                          if (!confirmed) return;
                          await fetch(`/api/admin/generation/options/${encodeURIComponent(opt.id)}`, {
                            method: 'DELETE',
                          });
                          await load(family);
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
