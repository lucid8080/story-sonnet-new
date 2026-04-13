import Link from 'next/link';

export default function ContentCalendarPlacementsPage() {
  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Placements</h2>
      <p>
        Each spotlight controls where it appears on the public site using toggles
        in the spotlight editor:
      </p>
      <ul className="list-inside list-disc space-y-2 text-slate-600">
        <li>
          <strong>Show badge on cover</strong> — lower-right PNG on story tiles and
          the homepage rotating grid.
        </li>
        <li>
          <strong>Show popup from badge</strong> — tapping the badge opens a short
          modal with title, blurb, and optional CTA.
        </li>
        <li>
          <strong>Info bar on story series page</strong> — compact banner on{' '}
          <code className="rounded bg-slate-100 px-1">/story/[slug]</code>.
        </li>
        <li>
          <strong>Feature on homepage library</strong> — curated horizontal rail above
          the main Story Library grid.
        </li>
        <li>
          <strong>Feature on library page</strong> — same style rail at the top of{' '}
          <Link href="/library" className="text-teal-700 underline">
            /library
          </Link>
          .
        </li>
      </ul>
      <p className="text-slate-500">
        This is separate from{' '}
        <Link href="/admin/campaigns/placements" className="text-teal-700 underline">
          Campaign placements
        </Link>{' '}
        (notification bars, checkout, etc.).
      </p>
    </div>
  );
}
