/** Shown when an admin enters a non-empty, non-Amazon, or malformed URL. */
export const AMAZON_BOOK_URL_ERROR = 'Enter a valid Amazon book URL.';

/** Storefront hosts we accept (with or without leading www.). */
const AMAZON_BOOK_HOST_SUFFIXES = [
  'amazon.com',
  'amazon.ca',
  'amazon.co.uk',
  'amazon.com.au',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.co.jp',
  /** Official Amazon short links (Share → Copy link). */
  'amzn.to',
  'a.co',
] as const;

export function normalizeAmazonBookUrl(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * True when hostname is an allowed Amazon storefront (exact match or www.).
 * Rejects lookalikes like amazon.example.com / notamazon.com.
 */
export function isAllowedAmazonBookHostname(hostname: string): boolean {
  const host = hostname.replace(/^www\./i, '').toLowerCase();
  return (AMAZON_BOOK_HOST_SUFFIXES as readonly string[]).includes(host);
}

export type ParseAmazonBookUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; message: string };

/**
 * Empty / whitespace → ok with null. Non-empty must be http(s) Amazon URL.
 */
export function parseAmazonBookUrl(
  raw: string | null | undefined
): ParseAmazonBookUrlResult {
  const normalized = normalizeAmazonBookUrl(raw);
  if (normalized == null) {
    return { ok: true, url: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, message: AMAZON_BOOK_URL_ERROR };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, message: AMAZON_BOOK_URL_ERROR };
  }

  if (!isAllowedAmazonBookHostname(parsed.hostname)) {
    return { ok: false, message: AMAZON_BOOK_URL_ERROR };
  }

  return { ok: true, url: normalized };
}

/**
 * Href for the public book control. Today: direct Amazon URL.
 * Later: swap to `/api/books/click/[episodeId]` without changing UI.
 */
export function getEpisodeAmazonBookHref(episode: {
  id: string;
  amazonBookUrl?: string | null;
}): string | null {
  return normalizeAmazonBookUrl(episode.amazonBookUrl);
}
