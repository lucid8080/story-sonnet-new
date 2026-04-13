import { ContentCalendarSubNav } from '@/components/admin/content-calendar/ContentCalendarSubNav';

export default function ContentCalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-black text-slate-900">Content Calendar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Seasonal and awareness spotlights: schedule curated rails, cover badges,
        and story page callouts.
      </p>
      <ContentCalendarSubNav />
      {children}
    </div>
  );
}
