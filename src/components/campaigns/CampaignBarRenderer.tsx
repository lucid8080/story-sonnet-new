'use client';

import type {
  PublicNotificationBarPayload,
  PublicTrialPayload,
  ResolvedCampaignPayload,
} from '@/lib/campaigns/types';
import {
  barForegroundMode,
  barTextClassNames,
  parseHexRgb,
  type BarTextClasses,
} from '@/lib/campaigns/barColors';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

function storageKey(id: string) {
  return `story-sonnet:campaign-dismiss:${id}`;
}

function dismissUntilMs(policy: string, campaignEnds?: string): number | null {
  const now = Date.now();
  if (policy === 'session') return null;
  if (policy === 'hours_24') return now + 24 * 60 * 60 * 1000;
  if (policy === 'days_7') return now + 7 * 24 * 60 * 60 * 1000;
  if (policy === 'until_campaign_end' && campaignEnds) {
    const t = new Date(campaignEnds).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return now + 24 * 60 * 60 * 1000;
}

function useDismissState(
  campaignId: string,
  dismissPolicy: string,
  dismissible: boolean,
  campaignEndsAt?: string
) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!dismissible || typeof window === 'undefined') return;
    const key = storageKey(campaignId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      const j = JSON.parse(raw) as { until?: number };
      if (typeof j.until === 'number' && Date.now() < j.until) {
        setHidden(true);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [campaignId, dismissible]);

  useEffect(() => {
    if (!dismissible || dismissPolicy !== 'session' || typeof window === 'undefined') return;
    const key = storageKey(campaignId);
    const v = window.sessionStorage.getItem(key);
    if (v === '1') setHidden(true);
  }, [campaignId, dismissPolicy, dismissible]);

  const dismiss = useCallback(() => {
    const until = dismissUntilMs(dismissPolicy, campaignEndsAt);
    if (dismissPolicy === 'session' && typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey(campaignId), '1');
    } else if (until && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey(campaignId), JSON.stringify({ until }));
    }
    setHidden(true);
    void fetch('/api/campaigns/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{ campaignId, type: 'dismiss', placement: 'global_top_bar' }],
      }),
    }).catch(() => {});
  }, [campaignId, dismissPolicy, campaignEndsAt]);

  return { hidden, dismiss };
}

function BarShell({
  campaignId,
  dismissible,
  dismissPolicy,
  campaignEndsAt,
  shellClassName,
  shellStyle,
  textClasses,
  badge,
  title,
  subtitle,
  cta,
}: {
  campaignId: string;
  dismissible: boolean;
  dismissPolicy: string;
  campaignEndsAt?: string;
  shellClassName: string;
  shellStyle?: CSSProperties;
  textClasses: BarTextClasses;
  badge: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  cta: ReactNode;
}) {
  const { hidden, dismiss } = useDismissState(
    campaignId,
    dismissPolicy,
    dismissible,
    campaignEndsAt
  );

  useEffect(() => {
    void fetch('/api/campaigns/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{ campaignId, type: 'impression', placement: 'global_top_bar' }],
      }),
    }).catch(() => {});
  }, [campaignId]);

  if (hidden) return null;

  return (
    <div
      className={`relative z-50 w-full px-3 py-2 text-sm shadow-md ${shellClassName}`}
      style={shellStyle}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        {badge}
        <div className="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
          <span className={`min-w-0 font-semibold leading-snug ${textClasses.primary}`}>{title}</span>
          {subtitle}
          {cta}
        </div>
        {dismissible ? (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${textClasses.dismiss}`}
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}

function notificationTailwindShell(payload: PublicNotificationBarPayload): {
  shellClassName: string;
  shellStyle?: CSSProperties;
  textClasses: BarTextClasses;
} {
  const bg =
    payload.bgVariant === 'dark'
      ? 'bg-slate-900'
      : payload.bgVariant === 'amber'
        ? 'bg-amber-600'
        : 'bg-violet-600';
  const textClasses =
    payload.textVariant === 'dark' ? barTextClassNames('light_bg') : barTextClassNames('dark_bg');
  return { shellClassName: bg, textClasses };
}

function NotificationBarView({ payload }: { payload: PublicNotificationBarPayload }) {
  const hex = payload.barBackgroundHex?.trim() || null;
  const custom = useMemo(() => {
    if (!hex || !parseHexRgb(hex)) return null;
    const mode = barForegroundMode(hex);
    return {
      shellClassName: '',
      shellStyle: { backgroundColor: hex } as CSSProperties,
      textClasses: barTextClassNames(mode),
    };
  }, [hex]);

  const legacy = useMemo(() => notificationTailwindShell(payload), [payload]);

  const shell = custom ?? {
    shellClassName: legacy.shellClassName,
    shellStyle: undefined as CSSProperties | undefined,
    textClasses: legacy.textClasses,
  };

  const badge = payload.iconOrBadgeText ? (
    <span
      className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${shell.textClasses.badge}`}
    >
      {payload.iconOrBadgeText}
    </span>
  ) : null;

  const subtitle = payload.messageSecondary ? (
    <span className={`text-xs ${shell.textClasses.secondary}`}>{payload.messageSecondary}</span>
  ) : null;

  const cta =
    payload.ctaLabel && payload.ctaUrl ? (
      <Link
        href={payload.ctaUrl}
        className={`inline-flex shrink-0 text-xs font-bold ${shell.textClasses.cta}`}
        onClick={() =>
          void fetch('/api/campaigns/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              events: [{ campaignId: payload.campaignId, type: 'cta_click', placement: 'global_top_bar' }],
            }),
          }).catch(() => {})
        }
      >
        {payload.ctaLabel}
      </Link>
    ) : null;

  return (
    <BarShell
      campaignId={payload.campaignId}
      dismissible={payload.dismissible}
      dismissPolicy={payload.dismissPolicy}
      campaignEndsAt={payload.campaignEndsAt}
      shellClassName={shell.shellClassName}
      shellStyle={shell.shellStyle}
      textClasses={shell.textClasses}
      badge={badge}
      title={payload.messagePrimary}
      subtitle={subtitle}
      cta={cta}
    />
  );
}

function trialCtaHref(landingSlug: string | null) {
  if (landingSlug?.trim()) {
    const s = landingSlug.trim().replace(/^\/+/, '');
    return `/${s}`;
  }
  return '/pricing';
}

function TrialBarView({ payload }: { payload: PublicTrialPayload }) {
  const dismissible = payload.dismissible ?? true;
  const dismissPolicy = payload.dismissPolicy ?? 'hours_24';
  const href = payload.ctaHref ?? trialCtaHref(payload.landingSlug);
  const hex = payload.barBackgroundHex?.trim() || null;

  const shell = useMemo(() => {
    if (hex && parseHexRgb(hex)) {
      const mode = barForegroundMode(hex);
      return {
        shellClassName: '',
        shellStyle: { backgroundColor: hex } as CSSProperties,
        textClasses: barTextClassNames(mode),
      };
    }
    return {
      shellClassName: 'bg-emerald-700',
      shellStyle: undefined as CSSProperties | undefined,
      textClasses: barTextClassNames('dark_bg'),
    };
  }, [hex]);

  const badge = payload.badgeText ? (
    <span
      className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${shell.textClasses.badge}`}
    >
      {payload.badgeText}
    </span>
  ) : (
    <span
      className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${shell.textClasses.badge}`}
    >
      Trial
    </span>
  );

  const subtitle = payload.subheadline ? (
    <span className={`text-xs ${shell.textClasses.secondary}`}>{payload.subheadline}</span>
  ) : null;

  const cta = (
    <Link
      href={href}
      className={`inline-flex shrink-0 text-xs font-bold ${shell.textClasses.cta}`}
      onClick={() =>
        void fetch('/api/campaigns/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: [{ campaignId: payload.campaignId, type: 'cta_click', placement: 'global_top_bar' }],
          }),
        }).catch(() => {})
      }
    >
      {payload.ctaLabel}
    </Link>
  );

  return (
    <BarShell
      campaignId={payload.campaignId}
      dismissible={dismissible}
      dismissPolicy={dismissPolicy}
      campaignEndsAt={payload.campaignEndsAt}
      shellClassName={shell.shellClassName}
      shellStyle={shell.shellStyle}
      textClasses={shell.textClasses}
      badge={badge}
      title={payload.headline}
      subtitle={subtitle}
      cta={cta}
    />
  );
}

export function CampaignBarRenderer({ payload }: { payload: ResolvedCampaignPayload }) {
  if (payload.kind === 'notification_bar') {
    return <NotificationBarView payload={payload} />;
  }
  if (payload.kind === 'trial_offer') {
    return <TrialBarView payload={payload} />;
  }
  return null;
}
