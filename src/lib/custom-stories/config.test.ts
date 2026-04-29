import { describe, expect, it } from 'vitest';
import { priceCentsForPackage, resolveEpisodeCountForPackage } from '@/lib/custom-stories/config';

describe('custom stories package mapping', () => {
  it('uses fixed episode counts for non-deluxe packages', () => {
    expect(resolveEpisodeCountForPackage('basic', 10)).toBe(1);
    expect(resolveEpisodeCountForPackage('plus', 10)).toBe(3);
    expect(resolveEpisodeCountForPackage('premium', 10)).toBe(5);
  });

  it('clamps deluxe episode count between 7 and 10', () => {
    expect(resolveEpisodeCountForPackage('deluxe', 1)).toBe(7);
    expect(resolveEpisodeCountForPackage('deluxe', 8)).toBe(8);
    expect(resolveEpisodeCountForPackage('deluxe', 12)).toBe(10);
  });

  it('calculates deluxe scaled pricing', () => {
    expect(priceCentsForPackage('basic', 1)).toBe(699);
    expect(priceCentsForPackage('deluxe', 7)).toBe(3499);
    expect(priceCentsForPackage('deluxe', 10)).toBe(4549);
  });
});
