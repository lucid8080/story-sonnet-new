import Link from 'next/link';

export default function ContentCalendarPreviewPage() {
  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Preview</h2>
      <p>
        Spotlights render on the live site when status is <strong>active</strong> or{' '}
        <strong>scheduled</strong>, <code className="rounded bg-slate-100 px-1">publishedAt</code>{' '}
        is set, and the current time falls in the effective date window (respecting
        recurrence and the spotlight timezone).
      </p>
      <p>Open the public site to verify rails, badges, and the story page info bar:</p>
      <ul className="flex flex-wrap gap-3">
        <li>
          <Link
            href="/"
            className="rounded-full bg-teal-600 px-4 py-2 font-bold text-white hover:bg-teal-500"
          >
            Homepage
          </Link>
        </li>
        <li>
          <Link
            href="/library"
            className="rounded-full bg-teal-600 px-4 py-2 font-bold text-white hover:bg-teal-500"
          >
            Library
          </Link>
        </li>
      </ul>
    </div>
  );
}
