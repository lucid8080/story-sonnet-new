import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const markReadBodySchema = z.object({
  at: z.string().optional(),
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const adminId = gate.session.user!.id;

  try {
    let seen = await prisma.adminNotificationSeen.findUnique({
      where: { adminUserId: adminId },
    });

    // First visit: start with an empty badge (no backlog) — see plan.
    if (!seen) {
      const now = new Date();
      seen = await prisma.adminNotificationSeen.create({
        data: { adminUserId: adminId, lastSeenAt: now },
      });
    }

    const windowStart = new Date(Date.now() - THIRTY_DAYS_MS);

    const [unreadCount, rawItems] = await Promise.all([
      prisma.adminInboxEvent.count({
        where: {
          createdAt: {
            gt: seen.lastSeenAt,
            gte: windowStart,
          },
        },
      }),
      prisma.adminInboxEvent.findMany({
        where: { createdAt: { gte: windowStart } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              profile: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    const items = rawItems.map((row) => ({
      id: row.id,
      type: row.type,
      createdAt: row.createdAt.toISOString(),
      unread: row.createdAt > seen!.lastSeenAt,
      user: {
        id: row.user.id,
        name: row.user.name ?? row.user.profile?.fullName ?? null,
        email: row.user.email,
        image: row.user.image,
      },
    }));

    return NextResponse.json({
      ok: true,
      data: {
        unreadCount,
        lastSeenAt: seen.lastSeenAt.toISOString(),
        items,
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/notifications]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const adminId = gate.session.user!.id;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }

  const parsed = markReadBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let at = new Date();
  if (parsed.data.at?.trim()) {
    const d = new Date(parsed.data.at);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ ok: false, error: 'Invalid date' }, { status: 400 });
    }
    at = d;
  }

  try {
    await prisma.adminNotificationSeen.upsert({
      where: { adminUserId: adminId },
      create: { adminUserId: adminId, lastSeenAt: at },
      update: { lastSeenAt: at },
    });

    return NextResponse.json({ ok: true, data: { lastSeenAt: at.toISOString() } });
  } catch (e) {
    console.error('[POST /api/admin/notifications]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
