import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { setPostScheduled } from '@/lib/blog/service';

const bodySchema = z.object({
  scheduledAt: z.coerce.date(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  try {
    await setPostScheduled(id, parsed.data.scheduledAt);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/blog schedule]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Schedule failed' },
      { status: 500 }
    );
  }
}
