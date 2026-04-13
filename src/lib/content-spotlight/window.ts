import type { ContentSpotlightRecurrence } from '@prisma/client';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export type SpotlightWindowFields = {
  startAt: Date;
  endAt: Date;
  recurrence: ContentSpotlightRecurrence;
  timezone: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `Date` instances that are safe to pass to `date-fns-tz` (rejects `Invalid Date`). */
function isValidInstant(d: Date): boolean {
  return d instanceof Date && Number.isFinite(d.getTime());
}

/** Range that contains no instant (so `instantInEffectiveWindow` is always false). */
function emptyUtcWindow(): { start: Date; end: Date } {
  return { start: new Date(1), end: new Date(0) };
}

/**
 * Only IANA zones are valid for `date-fns-tz`. Invalid strings (typos, abbreviations)
 * throw RangeError inside `formatInTimeZone` — fall back to UTC.
 */
export function safeTimeZone(raw: string | undefined | null): string {
  const tz = typeof raw === 'string' ? raw.trim() : '';
  if (tz === '') return 'UTC';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Calendar + clock parts in a named IANA timezone. */
function zonedParts(date: Date, timeZone: string): ZonedParts | null {
  const tz = safeTimeZone(timeZone);
  if (!isValidInstant(date)) return null;
  try {
    return {
      year: Number(formatInTimeZone(date, tz, 'yyyy')),
      month: Number(formatInTimeZone(date, tz, 'M')),
      day: Number(formatInTimeZone(date, tz, 'd')),
      hour: Number(formatInTimeZone(date, tz, 'H')),
      minute: Number(formatInTimeZone(date, tz, 'm')),
      second: Number(formatInTimeZone(date, tz, 's')),
    };
  } catch {
    return null;
  }
}

export function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const tz = safeTimeZone(timeZone);
  const isoLocal = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  return fromZonedTime(isoLocal, tz);
}

/**
 * Compare month/day (ignore year) for ordering within a calendar year.
 * Returns negative if a is before b, 0 if equal, positive if after.
 */
export function compareMonthDay(
  a: { month: number; day: number },
  b: { month: number; day: number }
): number {
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/**
 * Effective UTC window for a spotlight that contains `at` (inclusive),
 * or the window for the recurrence year derived from `at` when recurrence is yearly.
 */
export function getEffectiveWindowContaining(
  spotlight: SpotlightWindowFields,
  at: Date
): { start: Date; end: Date } {
  const tz = safeTimeZone(spotlight.timezone);

  if (spotlight.recurrence === 'one_time') {
    return { start: spotlight.startAt, end: spotlight.endAt };
  }

  if (
    !isValidInstant(spotlight.startAt) ||
    !isValidInstant(spotlight.endAt) ||
    !isValidInstant(at)
  ) {
    return emptyUtcWindow();
  }

  const s = zonedParts(spotlight.startAt, tz);
  const e = zonedParts(spotlight.endAt, tz);
  const atZ = zonedParts(at, tz);
  if (!s || !e || !atZ) {
    return emptyUtcWindow();
  }
  const y = atZ.year;

  const startUtc = wallTimeToUtc(
    y,
    s.month,
    s.day,
    s.hour,
    s.minute,
    s.second,
    tz
  );

  const endSameYear = wallTimeToUtc(
    y,
    e.month,
    e.day,
    e.hour,
    e.minute,
    e.second,
    tz
  );

  const mdS = { month: s.month, day: s.day };
  const mdE = { month: e.month, day: e.day };
  const wrapsCalendar =
    compareMonthDay(mdE, mdS) < 0 || endSameYear.getTime() < startUtc.getTime();

  if (wrapsCalendar) {
    const endUtc = wallTimeToUtc(
      y + 1,
      e.month,
      e.day,
      e.hour,
      e.minute,
      e.second,
      tz
    );
    return { start: startUtc, end: endUtc };
  }

  return { start: startUtc, end: endSameYear };
}

/** Whether `at` falls inside the spotlight's effective window (inclusive). */
export function instantInEffectiveWindow(
  spotlight: SpotlightWindowFields,
  at: Date
): boolean {
  const { start, end } = getEffectiveWindowContaining(spotlight, at);
  return start.getTime() <= at.getTime() && at.getTime() <= end.getTime();
}

/**
 * For `recurring_yearly`, the UTC window anchored on `calendarYear` in the spotlight's timezone
 * (start always in that calendar year; end may cross into the next calendar year).
 */
export function getYearlyWindowForCalendarYear(
  spotlight: SpotlightWindowFields,
  calendarYear: number
): { start: Date; end: Date } {
  const tz = safeTimeZone(spotlight.timezone);
  if (!isValidInstant(spotlight.startAt) || !isValidInstant(spotlight.endAt)) {
    return emptyUtcWindow();
  }
  const s = zonedParts(spotlight.startAt, tz);
  const e = zonedParts(spotlight.endAt, tz);
  if (!s || !e) {
    return emptyUtcWindow();
  }
  const startUtc = wallTimeToUtc(
    calendarYear,
    s.month,
    s.day,
    s.hour,
    s.minute,
    s.second,
    tz
  );
  const endSameYear = wallTimeToUtc(
    calendarYear,
    e.month,
    e.day,
    e.hour,
    e.minute,
    e.second,
    tz
  );
  const mdS = { month: s.month, day: s.day };
  const mdE = { month: e.month, day: e.day };
  const wrapsCalendar =
    compareMonthDay(mdE, mdS) < 0 ||
    endSameYear.getTime() < startUtc.getTime();
  if (wrapsCalendar) {
    return {
      start: startUtc,
      end: wallTimeToUtc(
        calendarYear + 1,
        e.month,
        e.day,
        e.hour,
        e.minute,
        e.second,
        tz
      ),
    };
  }
  return { start: startUtc, end: endSameYear };
}

/** UTC instant at noon on the 15th of [year, month] in `timeZone` (month 1–12). */
export function probeInstantForCalendarMonth(
  year: number,
  month: number,
  timeZone: string
): Date {
  return wallTimeToUtc(year, month, 15, 12, 0, 0, timeZone ?? '');
}

/** UTC range for the calendar month [year, month] (1-based month) in `timezone`. */
export function utcBoundsForCalendarMonth(
  year: number,
  month: number,
  timeZone: string
): { monthStartUtc: Date; nextMonthStartUtc: Date } {
  const monthStartUtc = wallTimeToUtc(year, month, 1, 0, 0, 0, timeZone ?? '');
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStartUtc = wallTimeToUtc(
    nextYear,
    nextMonth,
    1,
    0,
    0,
    0,
    timeZone ?? ''
  );
  return { monthStartUtc, nextMonthStartUtc };
}

/** Two UTC ranges overlap if they share any instant (inclusive bounds). */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}
