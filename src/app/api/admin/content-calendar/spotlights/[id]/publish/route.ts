import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  const now = new Date();
  const existing = await prisma.contentSpotlight.findUnique({
    where: { id },
    select: { startAt: true },
  });
  const shouldShiftStart =
    !!existing?.startAt && existing.startAt.getTime() > now.getTime();
  const row = await prisma.contentSpotlight.update({
    where: { id },
    data: {
      publishedAt: now,
      status: 'active',
      ...(shouldShiftStart ? { startAt: now } : {}),
    },
  });
  return NextResponse.json({ ok: true, spotlight: row });
}
