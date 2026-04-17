import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { adminBlogTagSchema } from '@/lib/validation/blogSchemas';

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = adminBlogTagSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  try {
    const item = await prisma.blogTag.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    console.error('[blog tags PATCH]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    await prisma.blogTag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[blog tags DELETE]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
