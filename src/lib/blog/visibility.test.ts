import { describe, expect, it } from 'vitest';
import { isBlogPostPubliclyVisible } from '@/lib/blog/visibility';

describe('isBlogPostPubliclyVisible', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');

  it('hides draft and archived', () => {
    expect(
      isBlogPostPubliclyVisible(
        { status: 'DRAFT', publishedAt: null, scheduledAt: null },
        now
      )
    ).toBe(false);
    expect(
      isBlogPostPubliclyVisible(
        { status: 'ARCHIVED', publishedAt: now, scheduledAt: null },
        now
      )
    ).toBe(false);
  });

  it('shows published', () => {
    expect(
      isBlogPostPubliclyVisible(
        { status: 'PUBLISHED', publishedAt: now, scheduledAt: null },
        now
      )
    ).toBe(true);
  });

  it('shows scheduled when time has passed', () => {
    expect(
      isBlogPostPubliclyVisible(
        {
          status: 'SCHEDULED',
          publishedAt: null,
          scheduledAt: new Date('2026-05-01T12:00:00.000Z'),
        },
        now
      )
    ).toBe(true);
  });

  it('hides scheduled future posts', () => {
    expect(
      isBlogPostPubliclyVisible(
        {
          status: 'SCHEDULED',
          publishedAt: null,
          scheduledAt: new Date('2026-07-01T12:00:00.000Z'),
        },
        now
      )
    ).toBe(false);
  });
});
