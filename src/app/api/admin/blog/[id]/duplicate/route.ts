import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { duplicateBlogPost } from '@/lib/blog/service';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const post = await duplicateBlogPost(id);
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error('[admin/blog duplicate]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Duplicate failed' },
      { status: 500 }
    );
  }
}
