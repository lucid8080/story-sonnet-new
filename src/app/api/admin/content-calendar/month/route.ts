import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { CalendarMonthFilter } from '@/lib/content-spotlight/types';
import { resolveCalendarMonth } from '@/lib/content-spotlight/calendarMonth';
import type {
  ContentSpotlightStatus,
  ContentSpotlightType,
} from '@prisma/client';

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get('year'));
  const month = Number(url.searchParams.get('month'));
  const viewTimeZone =
    url.searchParams.get('tz')?.trim() || 'UTC';

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: 'Invalid year or month' },
      { status: 400 }
    );
  }

  const filters: CalendarMonthFilter = {};
  const statusList = url.searchParams.getAll('status');
  if (statusList.length) {
    filters.status = statusList as ContentSpotlightStatus[];
  }
  const types = url.searchParams.getAll('type');
  if (types.length) {
    filters.types = types as ContentSpotlightType[];
  }
  if (url.searchParams.get('activeOnly') === '1') filters.activeOnly = true;
  if (url.searchParams.get('scheduledOnly') === '1') filters.scheduledOnly = true;
  if (url.searchParams.get('expiredOnly') === '1') filters.expiredOnly = true;
  if (url.searchParams.get('awareness') === '1') filters.awareness = true;
  if (url.searchParams.get('holiday') === '1') filters.holiday = true;
  if (url.searchParams.get('homepageFeatured') === '1') {
    filters.homepageFeatured = true;
  }
  if (url.searchParams.get('libraryFeatured') === '1') {
    filters.libraryFeatured = true;
  }

  const data = await resolveCalendarMonth({
    year,
    month,
    viewTimeZone,
    filters,
  });

  return NextResponse.json({ ok: true, month: data });
}
