'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarMonthDTO } from '@/lib/content-spotlight/types';

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
}

function buildQuery(
  year: number,
  month: number,
  tz: string,
  flags: Record<string, boolean>
): string {
  const p = new URLSearchParams();
  p.set('year', String(year));
  p.set('month', String(month));
  p.set('tz', tz);
  for (const [k, v] of Object.entries(flags)) {
    if (v) p.set(k, '1');
  }
  return p.toString();
}

export function ContentCalendarMonthClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tz, setTz] = useState('UTC');
  const [data, setData] = useState<CalendarMonthDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [fActive, setFActive] = useState(false);
  const [fScheduled, setFScheduled] = useState(false);
  const [fExpired, setFExpired] = useState(false);
  const [fAwareness, setFAwareness] = useState(false);
  const [fHoliday, setFHoliday] = useState(false);
  const [fHome, setFHome] = useState(false);
  const [fLib, setFLib] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const flags: Record<string, boolean> = {
      activeOnly: fActive,
      scheduledOnly: fScheduled,
      expiredOnly: fExpired,
      awareness: fAwareness,
      holiday: fHoliday,
      homepageFeatured: fHome,
      libraryFeatured: fLib,
    };
    try {
      const res = await fetch(
        `/api/admin/content-calendar/month?${buildQuery(year, month, tz, flags)}`
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Load failed');
      setData(j.month as CalendarMonthDTO);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    year,
    month,
    tz,
    fActive,
    fScheduled,
    fExpired,
    fAwareness,
    fHoliday,
    fHome,
    fLib,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const firstWeekday = useMemo(() => {
    const d = new Date(year, month - 1, 1).getDay();
    return d;
  }, [year, month]);

  const lastDay = data?.cells.length
    ? Math.max(...data.cells.map((c) => c.day))
    : new Date(year, month, 0).getDate();

  const cellsByDay = useMemo(() => {
    const m = new Map<number, CalendarMonthDTO['cells'][number]>();
    if (!data) return m;
    for (const c of data.cells) m.set(c.day, c);
    return m;
  }, [data]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const pad = firstWeekday;
  const gridSlots = pad + lastDay;
  const rows = Math.ceil(gridSlots / 7);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={prevMonth}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[12rem] text-lg font-black text-slate-900">
            {monthLabel(year, month)}
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-600">
            TZ
            <input
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs"
              placeholder="UTC"
            />
          </label>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
          {(
            [
              { label: 'Active', on: fActive, set: setFActive },
              { label: 'Scheduled', on: fScheduled, set: setFScheduled },
              { label: 'Expired', on: fExpired, set: setFExpired },
              { label: 'Awareness', on: fAwareness, set: setFAwareness },
              { label: 'Holiday', on: fHoliday, set: setFHoliday },
              { label: 'Home featured', on: fHome, set: setFHome },
              { label: 'Library featured', on: fLib, set: setFLib },
            ] as const
          ).map(({ label, on, set }) => (
            <label key={label} className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => set(e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading calendar…</p>
        ) : err ? (
          <p className="text-sm text-red-600">{err}</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: rows * 7 }, (_, i) => {
                const dayNum = i - pad + 1;
                if (dayNum < 1 || dayNum > lastDay) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square rounded-xl bg-slate-50"
                    />
                  );
                }
                const cell = cellsByDay.get(dayNum);
                const count = cell?.storyCount ?? 0;
                const has = (cell?.spotlightIds.length ?? 0) > 0;
                const sel = selectedDay === dayNum;
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDay(dayNum)}
                    className={`aspect-square rounded-xl border p-1 text-left text-xs transition ${
                      sel
                        ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                        : has
                          ? 'border-amber-200 bg-amber-50/80 hover:bg-amber-50'
                          : 'border-slate-100 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-black text-slate-800">{dayNum}</div>
                    {count > 0 ? (
                      <div className="mt-1 text-[10px] font-semibold text-amber-800">
                        {count} story{count === 1 ? '' : 'ies'}
                      </div>
                    ) : (
                      <div className="mt-1 text-[10px] text-slate-400">—</div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Month summary</h3>
          <p className="mt-1 text-xs text-slate-500">
            Spotlights overlapping this month (after filters).
          </p>
          <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto text-sm">
            {data?.spotlights.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/content-calendar/spotlights/${s.id}/edit`}
                  className="font-bold text-teal-700 hover:underline"
                >
                  {s.title}
                </Link>
                <div className="text-xs text-slate-500">
                  {s.status} · {s.storyCount} stories
                </div>
                {s.thumbnailCoverUrl ? (
                  <div className="relative mt-1 h-16 w-12 overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={s.thumbnailCoverUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : null}
              </li>
            ))}
            {data && data.spotlights.length === 0 ? (
              <li className="text-xs text-slate-500">No spotlights this month.</li>
            ) : null}
          </ul>
        </div>

        {selectedDay != null && data ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black text-slate-900">
              Day {selectedDay}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Publicly visible spotlight story count:{' '}
              {cellsByDay.get(selectedDay)?.storyCount ?? 0}
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {(cellsByDay.get(selectedDay)?.spotlightIds ?? []).map((id) => (
                <li key={id}>
                  <Link
                    href={`/admin/content-calendar/spotlights/${id}/edit`}
                    className="text-teal-700 hover:underline"
                  >
                    Edit spotlight
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
