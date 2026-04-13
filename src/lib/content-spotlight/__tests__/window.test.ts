import { describe, expect, it } from 'vitest';
import {
  compareMonthDay,
  getEffectiveWindowContaining,
  getYearlyWindowForCalendarYear,
  instantInEffectiveWindow,
} from '@/lib/content-spotlight/window';

describe('compareMonthDay', () => {
  it('orders month/day', () => {
    expect(compareMonthDay({ month: 3, day: 1 }, { month: 4, day: 1 })).toBeLessThan(
      0
    );
    expect(compareMonthDay({ month: 4, day: 2 }, { month: 4, day: 1 })).toBeGreaterThan(
      0
    );
  });
});

describe('getEffectiveWindowContaining yearly', () => {
  it('returns same calendar year when end after start', () => {
    const spotlight = {
      startAt: new Date('2024-04-01T12:00:00.000Z'),
      endAt: new Date('2024-04-30T12:00:00.000Z'),
      recurrence: 'recurring_yearly' as const,
      timezone: 'UTC',
    };
    const at = new Date('2026-04-15T12:00:00.000Z');
    const w = getEffectiveWindowContaining(spotlight, at);
    expect(w.start.toISOString()).toContain('2026-04-01');
    expect(w.end.toISOString()).toContain('2026-04-30');
    expect(instantInEffectiveWindow(spotlight, at)).toBe(true);
  });
});

describe('getYearlyWindowForCalendarYear wrap', () => {
  it('extends end into next year when campaign crosses year', () => {
    const spotlight = {
      startAt: new Date('2024-12-20T00:00:00.000Z'),
      endAt: new Date('2025-01-10T00:00:00.000Z'),
      recurrence: 'recurring_yearly' as const,
      timezone: 'UTC',
    };
    const w = getYearlyWindowForCalendarYear(spotlight, 2026);
    expect(w.start.getUTCFullYear()).toBe(2026);
    expect(w.end.getUTCFullYear()).toBe(2027);
  });
});

describe('one_time', () => {
  it('uses stored instants', () => {
    const spotlight = {
      startAt: new Date('2025-06-01T00:00:00.000Z'),
      endAt: new Date('2025-06-30T23:59:59.000Z'),
      recurrence: 'one_time' as const,
      timezone: 'UTC',
    };
    const w = getEffectiveWindowContaining(
      spotlight,
      new Date('2025-06-15T00:00:00.000Z')
    );
    expect(w.start).toEqual(spotlight.startAt);
    expect(w.end).toEqual(spotlight.endAt);
  });
});
