'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ART_STYLE_OPTIONS,
  type ArtStyleId,
  type ArtStylePromptOverrides,
} from '@/lib/story-studio/art-style-options';

function effectiveLines(
  stored: ArtStylePromptOverrides
): Record<ArtStyleId, string> {
  return Object.fromEntries(
    ART_STYLE_OPTIONS.map((o) => [
      o.id,
      (stored[o.id] ?? o.defaultPrompt).trim(),
    ])
  ) as Record<ArtStyleId, string>;
}

function toPayload(lines: Record<ArtStyleId, string>): ArtStylePromptOverrides {
  const out: ArtStylePromptOverrides = {};
  for (const o of ART_STYLE_OPTIONS) {
    const edited = (lines[o.id] ?? '').trim();
    const def = o.defaultPrompt.trim();
    if (edited !== def) out[o.id] = edited.slice(0, 3000);
  }
  return out;
}

export function ArtStylePresetPromptsEditor({
  storedOverrides,
  onSaved,
}: {
  storedOverrides: ArtStylePromptOverrides;
  onSaved: (next: ArtStylePromptOverrides) => void;
}) {
  const [lines, setLines] = useState<Record<ArtStyleId, string>>(() =>
    effectiveLines(storedOverrides)
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLines(effectiveLines(storedOverrides));
  }, [storedOverrides]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = toPayload(lines);
      const res = await fetch('/api/admin/story-studio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artStylePromptOverrides: payload }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        artStylePromptOverrides?: ArtStylePromptOverrides;
      };
      if (!res.ok) throw new Error(j.error || 'Save failed');
      const next = j.artStylePromptOverrides ?? {};
      onSaved(next);
      setNotice('Preset prompts saved');
      window.setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [lines, onSaved]);

  const resetOne = useCallback((id: ArtStyleId) => {
    const def = ART_STYLE_OPTIONS.find((o) => o.id === id)?.defaultPrompt ?? '';
    setLines((prev) => ({ ...prev, [id]: def }));
  }, []);

  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50/90">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-800">
        Customize art style preset prompts
      </summary>
      <div className="space-y-4 border-t border-slate-200 px-4 py-4">
        <p className="text-xs text-slate-600">
          These descriptions are sent to the brief, script, and cover image
          steps after the chip label. Leave a row matching the default to use
          the built-in text. Saved settings apply to all admins and drafts.
        </p>
        {error && (
          <p className="text-xs font-medium text-red-700">{error}</p>
        )}
        {notice && (
          <p className="text-xs font-medium text-green-700">{notice}</p>
        )}
        <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto pr-1">
          {ART_STYLE_OPTIONS.map((o) => (
            <div key={o.id} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {o.label}
                </label>
                <button
                  type="button"
                  onClick={() => resetOne(o.id)}
                  className="text-xs font-medium text-violet-700 underline"
                >
                  Reset to default
                </button>
              </div>
              <textarea
                className="min-h-[72px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                value={lines[o.id] ?? ''}
                maxLength={3000}
                onChange={(e) =>
                  setLines((prev) => ({ ...prev, [o.id]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save preset prompts'}
        </button>
      </div>
    </details>
  );
}
