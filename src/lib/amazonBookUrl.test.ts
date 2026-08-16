import { describe, expect, it } from 'vitest';
import {
  AMAZON_BOOK_URL_ERROR,
  getEpisodeAmazonBookHref,
  isAllowedAmazonBookHostname,
  normalizeAmazonBookUrl,
  parseAmazonBookUrl,
} from '@/lib/amazonBookUrl';

describe('normalizeAmazonBookUrl', () => {
  it('returns null for null, undefined, empty, and whitespace', () => {
    expect(normalizeAmazonBookUrl(null)).toBeNull();
    expect(normalizeAmazonBookUrl(undefined)).toBeNull();
    expect(normalizeAmazonBookUrl('')).toBeNull();
    expect(normalizeAmazonBookUrl('   ')).toBeNull();
  });

  it('trims and returns a non-empty string', () => {
    expect(
      normalizeAmazonBookUrl('  https://www.amazon.com/dp/B0EXAMPLE  ')
    ).toBe('https://www.amazon.com/dp/B0EXAMPLE');
  });
});

describe('isAllowedAmazonBookHostname', () => {
  it('allows common Amazon storefronts', () => {
    const hosts = [
      'amazon.com',
      'www.amazon.com',
      'amazon.ca',
      'www.amazon.ca',
      'amazon.co.uk',
      'www.amazon.co.uk',
      'amazon.com.au',
      'amazon.de',
      'amazon.fr',
      'amazon.it',
      'amazon.es',
      'amazon.co.jp',
      'www.amazon.co.jp',
      'amzn.to',
      'a.co',
      'www.a.co',
    ];
    for (const host of hosts) {
      expect(isAllowedAmazonBookHostname(host)).toBe(true);
    }
  });

  it('rejects non-Amazon hosts', () => {
    expect(isAllowedAmazonBookHostname('example.com')).toBe(false);
    expect(isAllowedAmazonBookHostname('amazon.example.com')).toBe(false);
    expect(isAllowedAmazonBookHostname('notamazon.com')).toBe(false);
  });
});

describe('parseAmazonBookUrl', () => {
  it('treats blank input as ok with null url', () => {
    expect(parseAmazonBookUrl('')).toEqual({ ok: true, url: null });
    expect(parseAmazonBookUrl('   ')).toEqual({ ok: true, url: null });
    expect(parseAmazonBookUrl(null)).toEqual({ ok: true, url: null });
    expect(parseAmazonBookUrl(undefined)).toEqual({ ok: true, url: null });
  });

  it('accepts valid Amazon https URLs', () => {
    expect(
      parseAmazonBookUrl('https://www.amazon.ca/dp/XXXXXXXXXX')
    ).toEqual({
      ok: true,
      url: 'https://www.amazon.ca/dp/XXXXXXXXXX',
    });
    expect(
      parseAmazonBookUrl('http://amazon.co.uk/dp/B012345678')
    ).toEqual({
      ok: true,
      url: 'http://amazon.co.uk/dp/B012345678',
    });
    expect(parseAmazonBookUrl('https://amzn.to/463wZuC')).toEqual({
      ok: true,
      url: 'https://amzn.to/463wZuC',
    });
    expect(parseAmazonBookUrl('https://a.co/d/example')).toEqual({
      ok: true,
      url: 'https://a.co/d/example',
    });
  });

  it('rejects invalid or non-Amazon URLs with a clear message', () => {
    expect(parseAmazonBookUrl('not-a-url')).toEqual({
      ok: false,
      message: AMAZON_BOOK_URL_ERROR,
    });
    expect(parseAmazonBookUrl('https://example.com/book')).toEqual({
      ok: false,
      message: AMAZON_BOOK_URL_ERROR,
    });
    expect(parseAmazonBookUrl('ftp://www.amazon.com/dp/X')).toEqual({
      ok: false,
      message: AMAZON_BOOK_URL_ERROR,
    });
  });
});

describe('getEpisodeAmazonBookHref', () => {
  it('returns null when the episode has no usable URL', () => {
    expect(getEpisodeAmazonBookHref({ id: '1', amazonBookUrl: null })).toBeNull();
    expect(
      getEpisodeAmazonBookHref({ id: '1', amazonBookUrl: '   ' })
    ).toBeNull();
    expect(getEpisodeAmazonBookHref({ id: '1' })).toBeNull();
  });

  it('returns the trimmed Amazon URL (direct link seam for future tracking)', () => {
    expect(
      getEpisodeAmazonBookHref({
        id: '42',
        amazonBookUrl: '  https://www.amazon.com/dp/B0EXAMPLE  ',
      })
    ).toBe('https://www.amazon.com/dp/B0EXAMPLE');
  });
});
