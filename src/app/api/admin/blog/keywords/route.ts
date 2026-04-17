import { NextResponse } from 'next/server';
import type {
  BlogKeywordStatus,
  BlogKeywordPriority,
  Prisma,
} from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { blogKeywordSchema } from '@/lib/validation/blogKeywordSchemas';
import { createKeywordRow } from '@/lib/blog/service';

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as BlogKeywordStatus | 'all' | null;
  const priority = searchParams.get('priority') as BlogKeywordPriority | 'all' | null;
  const categoryId = searchParams.get('categoryId');
  const groupId = searchParams.get('groupId');
  const q = searchParams.get('q')?.trim();
  const assigned = searchParams.get('assigned');
  const take = Math.min(Number(searchParams.get('take') ?? '80'), 200);
  const skip = Number(searchParams.get('skip') ?? '0');

  const where: Prisma.BlogKeywordWhereInput = {};
  if (status && status !== 'all') where.status = status;
  if (priority && priority !== 'all') where.priority = priority;
  if (categoryId) where.categoryId = categoryId;
  if (groupId) where.groupId = groupId;
  if (q) {
    where.OR = [
      { keyword: { contains: q, mode: 'insensitive' } },
      { normalizedKeyword: { contains: q.toLowerCase(), mode: 'insensitive' } },
    ];
  }
  if (assigned === 'yes') where.assignedBlogPostId = { not: null };
  if (assigned === 'no') where.assignedBlogPostId = null;

  const [items, total, stats] = await Promise.all([
    prisma.blogKeyword.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take,
      skip,
      include: {
        category: true,
        group: true,
        assignedPost: { select: { id: true, title: true, slug: true, status: true } },
      },
    }),
    prisma.blogKeyword.count({ where }),
    prisma.blogKeyword.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const statsMap = Object.fromEntries(
    stats.map((s) => [s.status, s._count._all])
  ) as Record<string, number>;

  return NextResponse.json({ ok: true, items, total, stats: statsMap });
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
  const parsed = blogKeywordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  try {
    const { keyword, ...rest } = parsed.data;
    const extra: Omit<
      Prisma.BlogKeywordCreateInput,
      'keyword' | 'normalizedKeyword'
    > = {
      searchIntent: rest.searchIntent ?? undefined,
      notes: rest.notes ?? undefined,
      priority: rest.priority ?? 'MEDIUM',
      status: rest.status ?? 'UNUSED',
      sourceType: rest.sourceType ?? 'MANUAL',
      targetAudience: rest.targetAudience ?? undefined,
      relatedQuestions: rest.relatedQuestions ?? undefined,
      tagsJson: rest.tagsJson ?? undefined,
      assignedTopicTitle: rest.assignedTopicTitle ?? undefined,
      ...(rest.categoryId
        ? { category: { connect: { id: rest.categoryId } } }
        : {}),
      ...(rest.groupId ? { group: { connect: { id: rest.groupId } } } : {}),
      ...(rest.assignedBlogPostId
        ? { assignedPost: { connect: { id: rest.assignedBlogPostId } } }
        : {}),
    };
    const item = await createKeywordRow(keyword, extra);
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    console.error('[keywords POST]', e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Create failed',
      },
      { status: 500 }
    );
  }
}
