import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { setPostUnpublished } from '@/lib/blog/service';

const bodySchema = z.object({
  mode: z.enum(['draft', 'archived']).optional().default('draft'),
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
  let json: unknown = {};
  try {
    if (req.headers.get('content-length') !== '0') {
      json = await req.json();
    }
  } catch {
    json = {};
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  try {
    await setPostUnpublished(id, parsed.data.mode);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/blog unpublish]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unpublish failed' },
      { status: 500 }
    );
  }
}
