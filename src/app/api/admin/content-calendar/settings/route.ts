import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const patchSchema = z.object({
  data: z.record(z.string(), z.any()),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let row = await prisma.contentCalendarSetting.findUnique({
    where: { id: 'global' },
  });
  if (!row) {
    row = await prisma.contentCalendarSetting.create({
      data: { id: 'global', data: {} },
    });
  }
  return NextResponse.json({ ok: true, settings: row });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const row = await prisma.contentCalendarSetting.upsert({
    where: { id: 'global' },
    create: { id: 'global', data: parsed.data.data },
    update: { data: parsed.data.data },
  });

  return NextResponse.json({ ok: true, settings: row });
}
