'use client';

import { barForegroundMode, barTextClassNames, parseHexRgb } from '@/lib/campaigns/barColors';
import { PASTEL_BAR_PRESETS } from '@/lib/campaigns/pastelBarPresets';
import { CAMPAIGN_PLACEMENT_KEYS } from '@/lib/validation/campaignSchemas';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type EditorMode = 'create' | 'edit';

type CampaignType = 'notification_bar' | 'trial_offer' | 'promo_code';

function defaultEnds(startIso: string) {
  const d = new Date(startIso);
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 16);
}

function BarBackgroundColorFields({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const pickerValue = /^#[0-9A-Fa-f]{6}$/i.test(value) ? value : '#8B5CF6';
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
      <div className="text-sm font-semibold text-slate-700">Top bar color (optional)</div>
      <p className="mt-0.5 text-xs text-slate-500">
        Applies to the global top bar only. Clear to use the default styling. Palette vibe:{' '}
        <a
          href="https://colorhunt.co/palettes/pastel"
          className="text-violet-600 underline"
          target="_blank"
          rel="noreferrer"
        >
          Color Hunt pastels
        </a>
        .
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PASTEL_BAR_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.label}
            aria-label={p.label}
            onClick={() => onChange(p.hex)}
            className="h-8 w-8 rounded-md ring-1 ring-slate-200 ring-offset-1 ring-offset-slate-50"
            style={{ backgroundColor: p.hex }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <span className="font-semibold">Picker</span>
          <input
            type="color"
            className="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-sm">
          <span className="shrink-0 font-semibold text-slate-700">Hex</span>
          <input
            className="mt-0 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs uppercase"
            placeholder="#RRGGBB"
            maxLength={7}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function CampaignEditor({
  mode,
  campaignType = 'notification_bar',
  campaignId,
}: {
  mode: EditorMode;
  campaignType?: CampaignType;
  campaignId?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<CampaignType>(campaignType);
  const [internalName, setInternalName] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [priority, setPriority] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState(() => defaultEnds(new Date().toISOString().slice(0, 16)));
  const [timezone, setTimezone] = useState('UTC');
  const [placements, setPlacements] = useState<string[]>(['global_top_bar']);

  const [msgPrimary, setMsgPrimary] = useState('');
  const [msgSecondary, setMsgSecondary] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [audience, setAudience] = useState('all');
  const [dismissPolicy, setDismissPolicy] = useState('session');
  const [notifBarHex, setNotifBarHex] = useState('');
  const [trialBarHex, setTrialBarHex] = useState('');

  const [headline, setHeadline] = useState('');
  const [subhead, setSubhead] = useState('');
  const [trialJson, setTrialJson] = useState('{}');
  /** Mirrors `eligibilityJson.newUserMaxAgeDays` for UX; merged on save. */
  const [trialSignupWindowDays, setTrialSignupWindowDays] = useState('');

  const [codeRaw, setCodeRaw] = useState('');
  const [publicTitle, setPublicTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(10);

  useEffect(() => {
    if (type !== 'trial_offer') return;
    try {
      const o = JSON.parse(trialJson) as { newUserMaxAgeDays?: unknown };
      const v = o.newUserMaxAgeDays;
      if (typeof v === 'number' && v > 0) {
        setTrialSignupWindowDays(String(v));
      }
    } catch {
      /* invalid JSON while typing — do not clobber the days field */
    }
  }, [trialJson, type]);

  useEffect(() => {
    if (mode !== 'edit' || !campaignId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/campaigns/${campaignId}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Load failed');
        const c = j.item;
        setType(c.type);
        setInternalName(c.internalName);
        setStatus(c.status);
        setPriority(c.priority);
        setPinned(c.pinnedHighest);
        setStartsAt(new Date(c.startsAt).toISOString().slice(0, 16));
        setEndsAt(new Date(c.endsAt).toISOString().slice(0, 16));
        setTimezone(c.timezone);
        setPlacements(c.placements.map((p: { placement: string }) => p.placement));
        if (c.notificationDetail) {
          setMsgPrimary(c.notificationDetail.messagePrimary);
          setMsgSecondary(c.notificationDetail.messageSecondary ?? '');
          setCtaLabel(c.notificationDetail.ctaLabel ?? '');
          setCtaUrl(c.notificationDetail.ctaUrl ?? '');
          setAudience(c.notificationDetail.audience);
          setDismissPolicy(c.notificationDetail.dismissPolicy);
          setNotifBarHex(c.notificationDetail.barBackgroundHex ?? '');
        }
        if (c.trialDetail) {
          setHeadline(c.trialDetail.headline);
          setSubhead(c.trialDetail.subheadline ?? '');
          const ej = c.trialDetail.eligibilityJson;
          setTrialJson(JSON.stringify(ej ?? {}, null, 2));
          const rawMax =
            ej && typeof ej === 'object' && !Array.isArray(ej)
              ? (ej as { newUserMaxAgeDays?: unknown }).newUserMaxAgeDays
              : undefined;
          const maxDays = typeof rawMax === 'number' && rawMax > 0 ? rawMax : null;
          setTrialSignupWindowDays(maxDays != null ? String(maxDays) : '');
          setTrialBarHex(c.trialDetail.barBackgroundHex ?? '');
        }
        if (c.promoDetail) {
          setCodeRaw(c.promoDetail.codeRaw);
          setPublicTitle(c.promoDetail.publicTitle);
          setPromoDesc(c.promoDetail.description);
          setDiscountType(c.promoDetail.discountType);
          setDiscountValue(c.promoDetail.discountValue);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Load failed');
      }
    })();
  }, [mode, campaignId]);

  function togglePlacement(p: string) {
    setPlacements((cur) => {
      if (cur.includes(p)) {
        const next = cur.filter((x) => x !== p);
        return next.length ? next : cur;
      }
      return [...cur, p].sort(
        (a, b) =>
          CAMPAIGN_PLACEMENT_KEYS.indexOf(a as (typeof CAMPAIGN_PLACEMENT_KEYS)[number]) -
          CAMPAIGN_PLACEMENT_KEYS.indexOf(b as (typeof CAMPAIGN_PLACEMENT_KEYS)[number])
      );
    });
  }

  function buildBody(publish: boolean) {
    const st = publish ? 'active' : status;
    const base = {
      internalName,
      status: st,
      priority,
      pinnedHighest: pinned,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      timezone,
      placements,
    };
    if (type === 'notification_bar') {
      return {
        type,
        ...base,
        notification: {
          messagePrimary: msgPrimary,
          messageSecondary: msgSecondary || null,
          ctaLabel: ctaLabel || null,
          ctaUrl: ctaUrl || null,
          audience,
          dismissPolicy,
          barBackgroundHex: notifBarHex.trim() === '' ? '' : notifBarHex.trim(),
        },
      };
    }
    if (type === 'trial_offer') {
      let eligibilityJson: Record<string, unknown> = {};
      try {
        eligibilityJson = JSON.parse(trialJson) as Record<string, unknown>;
      } catch {
        throw new Error('Invalid eligibility JSON');
      }
      const trimmed = trialSignupWindowDays.trim();
      const parsedDays = trimmed === '' ? NaN : Number(trimmed);
      if (Number.isInteger(parsedDays) && parsedDays > 0) {
        eligibilityJson = { ...eligibilityJson, newUserMaxAgeDays: parsedDays };
      } else {
        const { newUserMaxAgeDays: _removed, ...rest } = eligibilityJson;
        void _removed;
        eligibilityJson = rest;
      }
      return {
        type,
        ...base,
        trial: {
          headline,
          subheadline: subhead || null,
          eligibilityJson,
          barBackgroundHex: trialBarHex.trim() === '' ? '' : trialBarHex.trim(),
        },
      };
    }
    return {
      type,
      ...base,
      promo: {
        codeRaw,
        publicTitle,
        description: promoDesc,
        discountType,
        discountValue,
      },
    };
  }

  function stripTypeForPatch(body: object) {
    const { type, ...rest } = body as { type: string } & Record<string, unknown>;
    void type;
    return rest;
  }

  async function saveDraft() {
    try {
      const body = buildBody(false);
      if (mode === 'create') {
        const res = await fetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, status: 'draft' }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Create failed');
        toast.success('Draft saved');
        router.push(`/admin/campaigns/${j.id}/edit`);
      } else {
        const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stripTypeForPatch(body)),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Save failed');
        toast.success('Draft saved');
        if ('trial' in body && body.trial && typeof body.trial === 'object' && 'eligibilityJson' in body.trial) {
          setTrialJson(JSON.stringify((body.trial as { eligibilityJson: unknown }).eligibilityJson ?? {}, null, 2));
        }
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function publishNow() {
    try {
      const body = buildBody(true);
      if (mode === 'create') {
        const res = await fetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, status: 'active' }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Publish failed');
        toast.success('Published');
        router.push(`/admin/campaigns/${j.id}/edit`);
      } else {
        const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stripTypeForPatch({ ...body, status: 'active' })),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Publish failed');
        toast.success('Published');
        if ('trial' in body && body.trial && typeof body.trial === 'object' && 'eligibilityJson' in body.trial) {
          setTrialJson(JSON.stringify((body.trial as { eligibilityJson: unknown }).eligibilityJson ?? {}, null, 2));
        }
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed');
    }
  }

  async function duplicate() {
    if (!campaignId) return;
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/duplicate`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Duplicate failed');
      toast.success('Duplicated');
      router.push(`/admin/campaigns/${j.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Duplicate failed');
    }
  }

  const preview = useMemo(() => {
    if (type === 'notification_bar') {
      const h = notifBarHex.trim();
      if (h && parseHexRgb(h)) {
        const tc = barTextClassNames(barForegroundMode(h));
        return (
          <div className="rounded-xl px-4 py-3 text-sm shadow-sm" style={{ backgroundColor: h }}>
            <div className={`font-semibold ${tc.primary}`}>{msgPrimary || 'Primary message'}</div>
            {msgSecondary ? <div className={`mt-1 ${tc.secondary}`}>{msgSecondary}</div> : null}
            {ctaLabel ? (
              <div className={`mt-2 text-xs font-bold uppercase tracking-wide ${tc.cta}`}>{ctaLabel}</div>
            ) : null}
          </div>
        );
      }
      return (
        <div className="rounded-xl bg-violet-600 px-4 py-3 text-sm text-white">
          <div className="font-semibold">{msgPrimary || 'Primary message'}</div>
          {msgSecondary ? <div className="mt-1 text-violet-100">{msgSecondary}</div> : null}
          {ctaLabel ? (
            <div className="mt-2 text-xs font-bold uppercase tracking-wide text-violet-200">{ctaLabel}</div>
          ) : null}
        </div>
      );
    }
    if (type === 'trial_offer') {
      const h = trialBarHex.trim();
      if (h && parseHexRgb(h)) {
        const tc = barTextClassNames(barForegroundMode(h));
        return (
          <div className="rounded-xl px-4 py-3 text-sm shadow-sm" style={{ backgroundColor: h }}>
            <div className={`font-semibold ${tc.primary}`}>{headline || 'Headline'}</div>
            {subhead ? <div className={`mt-1 ${tc.secondary}`}>{subhead}</div> : null}
          </div>
        );
      }
      return (
        <div className="rounded-xl bg-emerald-700 px-4 py-3 text-sm text-white">
          <div className="font-semibold">{headline || 'Headline'}</div>
          {subhead ? <div className="mt-1 text-emerald-100">{subhead}</div> : null}
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-white">
        <div className="text-xs uppercase text-slate-400">Promo</div>
        <div className="font-mono text-lg font-bold">{codeRaw || 'CODE'}</div>
        <div>{publicTitle || 'Title'}</div>
      </div>
    );
  }, [
    type,
    msgPrimary,
    msgSecondary,
    ctaLabel,
    headline,
    subhead,
    codeRaw,
    publicTitle,
    notifBarHex,
    trialBarHex,
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/campaigns" className="text-sm text-violet-600">
            ← Back
          </Link>
          {mode === 'edit' && campaignId ? (
            <button
              type="button"
              onClick={() => void duplicate()}
              className="ml-auto text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Duplicate
            </button>
          ) : null}
        </div>

        <section>
          <h3 className="text-xs font-bold uppercase text-slate-400">Basics</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="font-semibold text-slate-700">Internal name</div>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <div className="font-semibold text-slate-700">Status</div>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="expired">expired</option>
              </select>
            </label>
            <label className="text-sm">
              <div className="font-semibold text-slate-700">Priority</div>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin as highest priority
            </label>
            <label className="text-sm">
              <div className="font-semibold text-slate-700">Starts</div>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <div className="font-semibold text-slate-700">Ends</div>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <div className="font-semibold text-slate-700">Timezone (IANA)</div>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase text-slate-400">Placements</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {CAMPAIGN_PLACEMENT_KEYS.map((p) => (
              <label key={p} className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={placements.includes(p)}
                  onChange={() => togglePlacement(p)}
                />
                {p}
              </label>
            ))}
          </div>
        </section>

        {type === 'notification_bar' ? (
          <section>
            <h3 className="text-xs font-bold uppercase text-slate-400">Notification content</h3>
            <div className="mt-2 grid gap-3">
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Message</div>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  rows={2}
                  value={msgPrimary}
                  onChange={(e) => setMsgPrimary(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Secondary</div>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={msgSecondary}
                  onChange={(e) => setMsgSecondary(e.target.value)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <div className="font-semibold text-slate-700">CTA label</div>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <div className="font-semibold text-slate-700">CTA URL</div>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                  />
                </label>
              </div>
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Audience</div>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value="all">all</option>
                  <option value="logged_out">logged_out</option>
                  <option value="logged_in">logged_in</option>
                  <option value="subscribers">subscribers</option>
                  <option value="free_users">free_users</option>
                  <option value="trial_users">trial_users</option>
                  <option value="new_users">new_users</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Dismiss policy</div>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={dismissPolicy}
                  onChange={(e) => setDismissPolicy(e.target.value)}
                >
                  <option value="session">session</option>
                  <option value="hours_24">hours_24</option>
                  <option value="days_7">days_7</option>
                  <option value="until_campaign_end">until_campaign_end</option>
                </select>
              </label>
              <BarBackgroundColorFields value={notifBarHex} onChange={setNotifBarHex} />
            </div>
          </section>
        ) : null}

        {type === 'trial_offer' ? (
          <section>
            <h3 className="text-xs font-bold uppercase text-slate-400">Trial offer</h3>
            <div className="mt-2 grid gap-3">
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Headline</div>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Subheadline</div>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={subhead}
                  onChange={(e) => setSubhead(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Eligible within first N days after signup</div>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  placeholder="No limit (use JSON below for advanced rules)"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={trialSignupWindowDays}
                  onChange={(e) => setTrialSignupWindowDays(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  When set, the offer is shown and can be claimed only for accounts this many days old or
                  newer (same as <code className="rounded bg-slate-100 px-0.5">newUserMaxAgeDays</code> in
                  eligibility JSON). Calendar start/end still apply.
                </p>
              </label>
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Eligibility JSON</div>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                  rows={6}
                  value={trialJson}
                  onChange={(e) => setTrialJson(e.target.value)}
                />
              </label>
              <BarBackgroundColorFields value={trialBarHex} onChange={setTrialBarHex} />
            </div>
          </section>
        ) : null}

        {type === 'promo_code' ? (
          <section>
            <h3 className="text-xs font-bold uppercase text-slate-400">Promo code</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <div className="font-semibold text-slate-700">Code (display)</div>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  value={codeRaw}
                  onChange={(e) => setCodeRaw(e.target.value)}
                  disabled={mode === 'edit'}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <div className="font-semibold text-slate-700">Public title</div>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={publicTitle}
                  onChange={(e) => setPublicTitle(e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <div className="font-semibold text-slate-700">Description</div>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  rows={2}
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Discount type</div>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="percent">percent</option>
                  <option value="fixed_cents">fixed_cents</option>
                  <option value="trial_extension_days">trial_extension_days</option>
                  <option value="free_first_payment">free_first_payment</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="font-semibold text-slate-700">Discount value</div>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              </label>
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveDraft()}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={() => void publishNow()}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Publish now
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase text-slate-400">Preview</h3>
        <div className="mt-2">{preview}</div>
      </div>
    </div>
  );
}
