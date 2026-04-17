import { describe, expect, it } from 'vitest';
import { estimateReadingTimeMinutesFromHtml } from '@/lib/blog/reading-time';

describe('estimateReadingTimeMinutesFromHtml', () => {
  it('returns at least 1 minute', () => {
    expect(estimateReadingTimeMinutesFromHtml('<p>hi</p>')).toBeGreaterThanOrEqual(1);
  });
});
