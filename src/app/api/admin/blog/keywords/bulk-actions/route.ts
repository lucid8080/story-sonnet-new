import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { blogKeywordBulkActionSchema } from '@/lib/validation/blogKeywordSchemas';

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = blogKeywordBulkActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { keywordIds, action } = parsed.data;

  try {
    if (action === 'delete') {
      await prisma.blogKeyword.deleteMany({ where: { id: { in: keywordIds } } });
      return NextResponse.json({ ok: true, deleted: keywordIds.length });
    }
    if (action === 'skip') {
      await prisma.blogKeyword.updateMany({
        where: { id: { in: keywordIds } },
        data: { status: 'SKIPPED', assignedBlogPostId: null },
      });
      return NextResponse.json({ ok: true, updated: keywordIds.length });
    }
    await prisma.blogKeyword.updateMany({
      where: { id: { in: keywordIds } },
      data: {
        status: 'UNUSED',
        assignedBlogPostId: null,
        completedAt: null,
      },
    });
    return NextResponse.json({ ok: true, updated: keywordIds.length });
  } catch (e) {
    console.error('[keywords bulk-actions]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Bulk action failed' },
      { status: 500 }
    );
  }
}
