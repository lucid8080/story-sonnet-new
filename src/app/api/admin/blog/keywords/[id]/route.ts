import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { blogKeywordSchema } from '@/lib/validation/blogKeywordSchemas';
import { normalizeKeywordPhrase } from '@/lib/blog/keyword-normalize';

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
  const parsed = blogKeywordSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  try {
    const d = parsed.data;
    const data: Prisma.BlogKeywordUpdateInput = {};
    if (d.keyword !== undefined) {
      data.keyword = d.keyword;
      data.normalizedKeyword = normalizeKeywordPhrase(d.keyword);
    }
    if (d.searchIntent !== undefined) data.searchIntent = d.searchIntent;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.priority !== undefined) data.priority = d.priority;
    if (d.status !== undefined) data.status = d.status;
    if (d.sourceType !== undefined) data.sourceType = d.sourceType;
    if (d.targetAudience !== undefined) data.targetAudience = d.targetAudience;
    if (d.relatedQuestions !== undefined) {
      data.relatedQuestions =
        d.relatedQuestions === null ? Prisma.JsonNull : d.relatedQuestions;
    }
    if (d.tagsJson !== undefined) {
      data.tagsJson = d.tagsJson === null ? Prisma.JsonNull : d.tagsJson;
    }
    if (d.assignedTopicTitle !== undefined) data.assignedTopicTitle = d.assignedTopicTitle;
    if (d.categoryId !== undefined) {
      data.category = d.categoryId
        ? { connect: { id: d.categoryId } }
        : { disconnect: true };
    }
    if (d.groupId !== undefined) {
      data.group = d.groupId ? { connect: { id: d.groupId } } : { disconnect: true };
    }
    if (d.assignedBlogPostId !== undefined) {
      data.assignedPost = d.assignedBlogPostId
        ? { connect: { id: d.assignedBlogPostId } }
        : { disconnect: true };
    }

    const item = await prisma.blogKeyword.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    console.error('[keywords PATCH]', e);
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
    await prisma.blogKeyword.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[keywords DELETE]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
