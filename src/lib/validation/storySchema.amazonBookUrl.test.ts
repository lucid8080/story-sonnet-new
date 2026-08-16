import { describe, expect, it } from 'vitest';
import { AMAZON_BOOK_URL_ERROR } from '@/lib/amazonBookUrl';
import { adminEpisodeSchema } from '@/lib/validation/storySchema';

const baseEpisode = {
  id: '1',
  episodeNumber: 1,
  title: 'Episode One',
};

describe('adminEpisodeSchema amazonBookUrl', () => {
  it('accepts omitted field as undefined (preserve on sync)', () => {
    const parsed = adminEpisodeSchema.parse(baseEpisode);
    expect(parsed.amazonBookUrl).toBeUndefined();
  });

  it('normalizes empty string and null to null', () => {
    expect(
      adminEpisodeSchema.parse({ ...baseEpisode, amazonBookUrl: '' })
        .amazonBookUrl
    ).toBeNull();
    expect(
      adminEpisodeSchema.parse({ ...baseEpisode, amazonBookUrl: '   ' })
        .amazonBookUrl
    ).toBeNull();
    expect(
      adminEpisodeSchema.parse({ ...baseEpisode, amazonBookUrl: null })
        .amazonBookUrl
    ).toBeNull();
  });

  it('accepts a valid Amazon URL', () => {
    const url = 'https://www.amazon.ca/dp/XXXXXXXXXX';
    expect(
      adminEpisodeSchema.parse({ ...baseEpisode, amazonBookUrl: url })
        .amazonBookUrl
    ).toBe(url);
  });

  it('rejects non-Amazon URLs', () => {
    const result = adminEpisodeSchema.safeParse({
      ...baseEpisode,
      amazonBookUrl: 'https://example.com/book',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(AMAZON_BOOK_URL_ERROR);
    }
  });
});
