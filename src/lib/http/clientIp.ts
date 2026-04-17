import type { NextRequest } from 'next/server';

/** First public client IP from proxy headers (same pattern as campaign API routes). */
export function getClientIp(request: NextRequest | Request): string {
  const h = request.headers;
  const xf = h.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return h.get('x-real-ip') || 'unknown';
}
