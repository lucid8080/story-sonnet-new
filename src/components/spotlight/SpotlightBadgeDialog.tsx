'use client';

import { useEffect } from 'react';
import type { StorySpotlightBadgeDTO } from '@/lib/content-spotlight/types';

export function SpotlightBadgeDialog({
  open,
  onClose,
  spotlight,
}: {
  open: boolean;
  onClose: () => void;
  spotlight: StorySpotlightBadgeDTO | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !spotlight) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-dialog-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="spotlight-dialog-title"
          className="text-lg font-black text-slate-900"
        >
          {spotlight.popupTitle || spotlight.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {spotlight.popupBody || spotlight.shortBlurb}
        </p>
        {spotlight.ctaUrl && spotlight.ctaLabel ? (
          <a
            href={spotlight.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-500"
          >
            {spotlight.ctaLabel}
          </a>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full border border-slate-200 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}
