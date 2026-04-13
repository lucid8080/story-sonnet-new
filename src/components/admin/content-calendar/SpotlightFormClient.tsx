'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  SpotlightStoriesEditor,
  type PickedStory,
} from '@/components/admin/content-calendar/SpotlightStoriesEditor';
import type { ContentSpotlightBadgeCorner } from '@/lib/validation/contentSpotlightSchema';

type Props = {
  spotlightId?: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function defaultIsoRange() {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(a);
  b.setDate(b.getDate() + 14);
  return {
    start: a.toISOString().slice(0, 16),
    end: b.toISOString().slice(0, 16),
  };
}

export function SpotlightFormClient({ spotlightId }: Props) {
  const router = useRouter();
  const isNew = !spotlightId;
  const { start: defStart, end: defEnd } = defaultIsoRange();

  const [internalName, setInternalName] = useState('New spotlight');
  const [title, setTitle] = useState('New spotlight');
  const [slug, setSlug] = useState('new-spotlight');
  const [type, setType] = useState<
    'holiday' | 'awareness_month' | 'seasonal' | 'editorial'
  >('seasonal');
  const [shortBlurb, setShortBlurb] = useState(
    () =>
      (isNew
        ? 'Replace this short blurb (used on cards and in the calendar).'
        : '')
  );
  const [longDescription, setLongDescription] = useState('');
  const [popupTitle, setPopupTitle] = useState(
    () => (isNew ? 'Replace this popup title' : '')
  );
  const [popupBody, setPopupBody] = useState(
    () =>
      (isNew
        ? 'Replace this popup body. You can edit tone and links before publishing.'
        : '')
  );
  const [infoBarText, setInfoBarText] = useState(
    () =>
      (isNew
        ? 'Replace this info bar text (shown on story pages when the spotlight is active).'
        : '')
  );
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [startAt, setStartAt] = useState(defStart);
  const [endAt, setEndAt] = useState(defEnd);
  const [timezone, setTimezone] = useState('UTC');
  const [recurrence, setRecurrence] = useState<'one_time' | 'recurring_yearly'>(
    'one_time'
  );
  const [status, setStatus] = useState<
    'draft' | 'scheduled' | 'active' | 'paused' | 'expired'
  >('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [showBadge, setShowBadge] = useState(true);
  const [showPopup, setShowPopup] = useState(true);
  const [showInfoBar, setShowInfoBar] = useState(true);
  const [featureOnHomepage, setFeatureOnHomepage] = useState(false);
  const [featureOnLibraryPage, setFeatureOnLibraryPage] = useState(false);
  const [priority, setPriority] = useState(0);
  const [themeToken, setThemeToken] = useState('');
  const [badgeAssetId, setBadgeAssetId] = useState<string | null>(null);
  const [badgePreviewUrl, setBadgePreviewUrl] = useState<string | null>(null);
  const [badgeCorner, setBadgeCorner] =
    useState<ContentSpotlightBadgeCorner>('bottom_right');
  const [badgeAssets, setBadgeAssets] = useState<
    { id: string; name: string; publicUrl: string }[]
  >([]);
  const [stories, setStories] = useState<PickedStory[]>([]);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/content-calendar/badge-assets');
        const j = await res.json();
        if (j.ok) setBadgeAssets(j.badgeAssets);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const loadSpotlight = useCallback(
    async (options?: { showSpinner?: boolean }) => {
      if (!spotlightId) return;
      const showSpinner = options?.showSpinner ?? false;
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/content-calendar/spotlights/${spotlightId}`
        );
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Load failed');
        const s = j.spotlight;
        setInternalName(s.internalName);
        setTitle(s.title);
        setSlug(s.slug);
        setType(s.type);
        setShortBlurb(s.shortBlurb);
        setLongDescription(s.longDescription ?? '');
        setPopupTitle(s.popupTitle);
        setPopupBody(s.popupBody);
        setInfoBarText(s.infoBarText);
        setCtaLabel(s.ctaLabel ?? '');
        setCtaUrl(s.ctaUrl ?? '');
        setStartAt(new Date(s.startAt).toISOString().slice(0, 16));
        setEndAt(new Date(s.endAt).toISOString().slice(0, 16));
        setTimezone(s.timezone ?? 'UTC');
        setRecurrence(s.recurrence);
        setStatus(s.status);
        setPublishedAt(
          s.publishedAt ? new Date(s.publishedAt).toISOString().slice(0, 16) : null
        );
        setShowBadge(s.showBadge);
        setShowPopup(s.showPopup);
        setShowInfoBar(s.showInfoBar);
        setFeatureOnHomepage(s.featureOnHomepage);
        setFeatureOnLibraryPage(s.featureOnLibraryPage);
        setPriority(s.priority);
        setThemeToken(s.themeToken ?? '');
        setBadgeAssetId(s.badgeAssetId ?? null);
        setBadgePreviewUrl(s.badgeAsset?.publicUrl ?? null);
        setBadgeCorner(
          (s.badgeCorner as ContentSpotlightBadgeCorner | undefined) ??
            'bottom_right'
        );
        setStories(
          (
            s.stories as {
              storyId: string | bigint;
              sortOrder: number;
              isFeatured: boolean;
              story: {
                slug: string;
                title: string;
                coverUrl: string | null;
              };
            }[]
          ).map((row) => ({
            id: String(row.storyId),
            slug: row.story.slug,
            title: row.story.title,
            coverUrl: row.story.coverUrl,
            sortOrder: row.sortOrder,
            isFeatured: row.isFeatured,
          }))
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [spotlightId]
  );

  useEffect(() => {
    if (!spotlightId) return;
    void loadSpotlight({ showSpinner: true });
  }, [spotlightId, loadSpotlight]);

  const buildPayload = () => ({
    internalName,
    title,
    slug,
    type,
    shortBlurb,
    longDescription: longDescription.trim() ? longDescription : null,
    popupTitle,
    popupBody,
    infoBarText,
    ctaLabel: ctaLabel.trim() ? ctaLabel : null,
    ctaUrl: ctaUrl.trim() ? ctaUrl : null,
    startAt: new Date(startAt).toISOString(),
    endAt: new Date(endAt).toISOString(),
    timezone,
    recurrence,
    status,
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
    showBadge,
    badgeCorner,
    showPopup,
    showInfoBar,
    featureOnHomepage,
    featureOnLibraryPage,
    priority,
    themeToken: themeToken.trim() ? themeToken : null,
    badgeAssetId,
    stories: [...stories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s, idx) => ({
        storyId: s.id,
        sortOrder: idx,
        isFeatured: s.isFeatured,
        cardTitleOverride: null,
      })),
  });

  const save = async (mode: 'draft' | 'publish') => {
    const payload = buildPayload();
    if (mode === 'publish') {
      const nowIso = new Date().toISOString();
      payload.status = 'active';
      payload.publishedAt = nowIso;
      // Publish-now should be visible now even if draft start date was future.
      if (new Date(payload.startAt).getTime() > Date.now()) {
        payload.startAt = nowIso;
      }
    }
    const url = isNew
      ? '/api/admin/content-calendar/spotlights'
      : `/api/admin/content-calendar/spotlights/${spotlightId}`;
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!res.ok) {
      const fe = j.details?.fieldErrors as Record<string, string[] | undefined> | undefined;
      const detail =
        fe && typeof fe === 'object'
          ? Object.entries(fe)
              .filter(([, v]) => Array.isArray(v) && v.length)
              .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
              .join('; ')
          : '';
      toast.error(detail ? `${j.error}: ${detail}` : j.error || 'Save failed');
      return;
    }
    toast.success('Saved');
    if (isNew && j.spotlight?.id) {
      router.replace(`/admin/content-calendar/spotlights/${j.spotlight.id}/edit`);
    } else {
      router.refresh();
    }
  };

  const uploadBadge = async (file: File) => {
    const fd = new FormData();
    fd.set('file', file);
    fd.set('assetKind', 'spotlight_badge');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error || 'Upload failed');
      return;
    }
    const name = file.name.replace(/\.[^.]+$/, '') || 'Badge';
    const reg = await fetch('/api/admin/content-calendar/badge-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        publicUrl: j.fileUrl,
        storagePath: j.storagePath,
        altText: title,
        mimeType: 'image/png',
        fileSizeBytes: file.size,
      }),
    });
    const rj = await reg.json();
    if (!reg.ok) {
      toast.error(rj.error || 'Register failed');
      return;
    }
    setBadgeAssetId(rj.badgeAsset.id);
    setBadgePreviewUrl(rj.badgeAsset.publicUrl);
    toast.success('Badge uploaded');
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading spotlight…</p>;
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save('draft')}
          className="rounded-full bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-300"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={() => void save('publish')}
          className="rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-500"
        >
          Publish now
        </button>
        {!isNew && spotlightId ? (
          <>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch(
                  `/api/admin/content-calendar/spotlights/${spotlightId}/publish`,
                  { method: 'POST' }
                );
                if (res.ok) {
                  toast.success('Published');
                  await loadSpotlight({ showSpinner: false });
                  router.refresh();
                } else toast.error('Publish failed');
              }}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500"
            >
              Mark published
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch(
                  `/api/admin/content-calendar/spotlights/${spotlightId}/pause`,
                  { method: 'POST' }
                );
                if (res.ok) {
                  toast.success('Paused');
                  await loadSpotlight({ showSpinner: false });
                  router.refresh();
                } else toast.error('Pause failed');
              }}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch(
                  `/api/admin/content-calendar/spotlights/${spotlightId}/resume`,
                  { method: 'POST' }
                );
                if (res.ok) {
                  toast.success('Resumed');
                  await loadSpotlight({ showSpinner: false });
                  router.refresh();
                } else toast.error('Resume failed');
              }}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch(
                  `/api/admin/content-calendar/spotlights/${spotlightId}/duplicate`,
                  { method: 'POST' }
                );
                const j = await res.json();
                if (res.ok && j.spotlight?.id) {
                  toast.success('Duplicated');
                  router.push(
                    `/admin/content-calendar/spotlights/${j.spotlight.id}/edit`
                  );
                } else toast.error('Duplicate failed');
              }}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Duplicate
            </button>
          </>
        ) : null}
        <Link
          href="/admin/content-calendar/spotlights"
          className="ml-auto rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Back to list
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-slate-900">Basics</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">
            Internal name
            <input
              value={internalName}
              onChange={(e) => setInternalName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Public title
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (isNew) setSlug(slugify(e.target.value));
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Slug
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="holiday">Holiday</option>
              <option value="awareness_month">Awareness month</option>
              <option value="seasonal">Seasonal</option>
              <option value="editorial">Editorial</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-slate-900">Dates and recurrence</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">
            Start (local ISO field; stored as UTC instant)
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            End
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Timezone (IANA)
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="America/Toronto"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Recurrence
            <select
              value={recurrence}
              onChange={(e) =>
                setRecurrence(e.target.value as typeof recurrence)
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="one_time">One-time</option>
              <option value="recurring_yearly">Recurring yearly</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Published at (optional ISO)
            <input
              type="datetime-local"
              value={publishedAt ?? ''}
              onChange={(e) =>
                setPublishedAt(e.target.value ? e.target.value : null)
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-slate-900">Blurb and popup</h2>
        <div className="mt-3 grid gap-3">
          <label className="block text-xs font-semibold text-slate-600">
            Short blurb
            <textarea
              value={shortBlurb}
              onChange={(e) => setShortBlurb(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Long description (optional)
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Popup title
            <input
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Popup body
            <textarea
              value={popupBody}
              onChange={(e) => setPopupBody(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Info bar text
            <textarea
              value={infoBarText}
              onChange={(e) => setInfoBarText(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              CTA label
              <input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              CTA URL
              <input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-slate-900">Badge (PNG)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Upload a transparent PNG. Max 1MB. Reuse assets from{' '}
          <Link href="/admin/content-calendar/badge-assets" className="text-teal-700 underline">
            Badge assets
          </Link>
          .
        </p>
        <label className="mt-3 block text-xs font-semibold text-slate-600">
          Corner on cover
          <select
            value={badgeCorner}
            onChange={(e) =>
              setBadgeCorner(e.target.value as ContentSpotlightBadgeCorner)
            }
            className="mt-1 w-full max-w-lg rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="bottom_right">Bottom right</option>
            <option value="bottom_left">Bottom left</option>
            <option value="top_right">Top right</option>
            <option value="top_left">Top left</option>
          </select>
        </label>
        <input
          type="file"
          accept="image/png"
          className="mt-2 text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadBadge(f);
          }}
        />
        <label className="mt-3 block text-xs font-semibold text-slate-600">
          Or attach existing asset
          <select
            value={badgeAssetId ?? ''}
            onChange={(e) => {
              const id = e.target.value || null;
              setBadgeAssetId(id);
              const row = badgeAssets.find((b) => b.id === id);
              setBadgePreviewUrl(row?.publicUrl ?? null);
            }}
            className="mt-1 w-full max-w-lg rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {badgeAssets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {badgeAssetId ? (
          <p className="mt-2 text-xs text-slate-600">Asset id: {badgeAssetId}</p>
        ) : null}
        <div className="relative mt-4 aspect-[3/4] w-40 overflow-hidden rounded-xl bg-slate-200">
          <Image
            src="/branding/logo.png"
            alt="Sample cover"
            fill
            className="object-cover object-top"
            sizes="160px"
          />
          {badgePreviewUrl ? (
            <div
              className={`absolute h-14 w-14 ${
                badgeCorner === 'bottom_right'
                  ? 'bottom-3 right-3'
                  : badgeCorner === 'bottom_left'
                    ? 'bottom-3 left-3'
                    : badgeCorner === 'top_right'
                      ? 'top-3 right-3'
                      : 'top-3 left-3'
              }`}
            >
              <Image
                src={badgePreviewUrl}
                alt="Badge preview"
                width={56}
                height={56}
                className="drop-shadow-md"
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-slate-900">Story selection</h2>
        <SpotlightStoriesEditor stories={stories} onChange={setStories} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-slate-900">Placements and priority</h2>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showBadge}
              onChange={(e) => setShowBadge(e.target.checked)}
            />
            Show badge on cover
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showPopup}
              onChange={(e) => setShowPopup(e.target.checked)}
            />
            Show popup from badge
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInfoBar}
              onChange={(e) => setShowInfoBar(e.target.checked)}
            />
            Info bar on story page
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={featureOnHomepage}
              onChange={(e) => setFeatureOnHomepage(e.target.checked)}
            />
            Feature on homepage library
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={featureOnLibraryPage}
              onChange={(e) => setFeatureOnLibraryPage(e.target.checked)}
            />
            Feature on library page
          </label>
        </div>
        <label className="mt-4 block text-xs font-semibold text-slate-600">
          Priority (higher first)
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="mt-1 w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold text-slate-600">
          Theme token (optional)
          <input
            value={themeToken}
            onChange={(e) => setThemeToken(e.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </section>
    </div>
  );
}
