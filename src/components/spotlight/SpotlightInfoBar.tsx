import Link from 'next/link';
import type { StorySpotlightInfoBarDTO } from '@/lib/content-spotlight/types';

export function SpotlightInfoBar({
  spotlight,
}: {
  spotlight: StorySpotlightInfoBarDTO | null;
}) {
  if (!spotlight) return null;
  return (
    <div className="mb-6 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-sky-50 px-4 py-3 shadow-sm ring-1 ring-teal-100/80">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            {spotlight.title}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {spotlight.infoBarText || spotlight.shortBlurb}
          </p>
        </div>
        {spotlight.ctaUrl && spotlight.ctaLabel ? (
          <Link
            href={spotlight.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500"
          >
            {spotlight.ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
