import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimitKey } from '@/lib/campaigns/rateLimit';
import { campaignEventsBodySchema } from '@/lib/validation/campaignSchemas';
import prisma from '@/lib/prisma';

function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

function originOk(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!host) return true;
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!originOk(req)) {
    return NextResponse.json({ ok: false, error: 'Invalid origin' }, { status: 403 });
  }

  const ip = clientIp(req);
  if (!rateLimitKey(`cevt:${ip}`, 120, 60_000)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = campaignEventsBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    await prisma.campaignAnalyticsEvent.createMany({
      data: parsed.data.events.map((ev) => ({
        campaignId: ev.campaignId,
        type: ev.type,
        placement: ev.placement ?? null,
        userId,
        sessionKey: ev.sessionKey ?? null,
        metadata: (ev.metadata ?? {}) as object,
      })),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[campaigns/events]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Log failed' },
      { status: 500 }
    );
  }
}
