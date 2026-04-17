import { NextResponse } from 'next/server';
import type { BlogPostStatus, Prisma } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { createEmptyDraftPost } from '@/lib/blog/service';

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const categoryId = searchParams.get('categoryId');
  const featured = searchParams.get('featured');
  const q = searchParams.get('q')?.trim();
  const sort = searchParams.get('sort') ?? 'updated';
  const take = Math.min(Number(searchParams.get('take') ?? '40'), 100);
  const skip = Number(searchParams.get('skip') ?? '0');

  const where: Prisma.BlogPostWhereInput = {};
  if (status && status !== 'all') {
    where.status = status as BlogPostStatus;
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (featured === '1' || featured === 'true') {
    where.isFeatured = true;
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.BlogPostOrderByWithRelationInput[] =
    sort === 'published'
      ? [{ publishedAt: 'desc' }]
      : sort === 'created'
        ? [{ createdAt: 'desc' }]
        : [{ updatedAt: 'desc' }];

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        category: true,
        linkedKeyword: { select: { id: true, keyword: true, status: true } },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return NextResponse.json({ ok: true, items, total });
}

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const post = await createEmptyDraftPost(session.user.id);
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error('[admin/blog POST]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Create failed' },
      { status: 500 }
    );
  }
}
