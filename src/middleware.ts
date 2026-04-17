import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitKey } from '@/lib/campaigns/rateLimit';
import { getClientIp } from '@/lib/http/clientIp';

const REGISTER_WINDOW_MS = 15 * 60_000;
const REGISTER_MAX_PER_WINDOW = 5;
const CREDENTIALS_WINDOW_MS = 15 * 60_000;
const CREDENTIALS_MAX_PER_WINDOW = 30;

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (request.method === 'POST' && pathname === '/api/register') {
    const ip = getClientIp(request);
    if (!rateLimitKey(`reg:${ip}`, REGISTER_MAX_PER_WINDOW, REGISTER_WINDOW_MS)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  if (request.method === 'POST' && pathname === '/api/auth/callback/credentials') {
    const ip = getClientIp(request);
    if (!rateLimitKey(`cred:${ip}`, CREDENTIALS_MAX_PER_WINDOW, CREDENTIALS_WINDOW_MS)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
