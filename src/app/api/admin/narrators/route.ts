import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { fetchAllNarratorsAdmin } from '@/lib/narrators';
import { adminNarratorSchema } from '@/lib/validation/narratorSchema';

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  try {
    const items = await fetchAllNarratorsAdmin();
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('[admin/narrators GET]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Load failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = adminNarratorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  try {
    const item = await prisma.narrator.create({ data: parsed.data });
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    console.error('[admin/narrators POST]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Create failed' },
      { status: 500 }
    );
  }
}
