'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { ExternalKeywordLinkRule } from '@/lib/blog/blog-admin-settings';

function newRuleId(): string {
  return `rule-${Date.now().toString(36)}`;
}

export function AutoKeywordLinkRulesEditor() {
  const [rules, setRules] = useState<ExternalKeywordLinkRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [href, setHref] = useState('');
  const [label, setLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog/admin-settings');
      const data = (await res.json()) as {
        ok?: boolean;
        autoKeywordLinkRules?: ExternalKeywordLinkRule[];
      };
      if (res.ok && data.ok && Array.isArray(data.autoKeywordLinkRules)) {
        setRules(data.autoKeywordLinkRules);
      }
    } catch {
      toast.error('Could not load external link rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: ExternalKeywordLinkRule[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/blog/admin-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoKeywordLinkRules: next }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        autoKeywordLinkRules?: ExternalKeywordLinkRule[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Save failed');
        return false;
      }
      setRules(data.autoKeywordLinkRules ?? next);
      return true;
    } catch {
      toast.error('Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addRule = async () => {
    const p = phrase.trim();
    const u = href.trim();
    if (p.length < 2 || !/^https?:\/\//i.test(u)) {
      toast.error('Enter a phrase (2+ chars) and a valid http(s) URL');
      return;
    }
    const next: ExternalKeywordLinkRule[] = [
      ...rules,
      {
        id: newRuleId(),
        phrase: p,
        href: u,
        label: label.trim() || p,
        enabled: true,
      },
    ];
    const ok = await persist(next);
    if (ok) {
      setPhrase('');
      setHref('');
      setLabel('');
      toast.success('Rule added');
    }
  };

  const removeRule = async (id: string) => {
    const ok = await persist(rules.filter((r) => r.id !== id));
    if (ok) toast.success('Rule removed');
  };

  return (
    <div className="border-t border-slate-100 pt-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
        External auto-links
      </h3>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">
        Phrase → URL rules used by the editor’s auto-link tool (nofollow on
        external).
      </p>

      {loading ? (
        <p className="mt-2 text-xs text-slate-400">Loading…</p>
      ) : (
        <>
          {rules.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-[11px]"
                >
                  <span className="min-w-0">
                    <span className="font-semibold text-slate-800">
                      {r.phrase}
                    </span>
                    <span className="block truncate text-slate-500">{r.href}</span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-red-600 hover:underline"
                    disabled={saving}
                    onClick={() => void removeRule(r.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 grid gap-1.5">
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
              placeholder="Phrase (e.g. sleep stories)"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
              placeholder="https://…"
              value={href}
              onChange={(e) => setHref(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={saving}
              onClick={() => void addRule()}
            >
              Add rule
            </button>
          </div>
        </>
      )}
    </div>
  );
}
