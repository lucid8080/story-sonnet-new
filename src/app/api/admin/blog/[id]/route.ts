import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { adminBlogPostUpsertSchema } from '@/lib/validation/blogSchemas';
import {
  updateBlogPostFromAdmin,
} from '@/lib/blog/service';
import {
  releaseKeywordFromDeletedOrUnlinkedPost,
} from '@/lib/blog/keyword-sync';
import { revalidatePath } from 'next/cache';

const include = {
  category: true,
  tags: { include: { tag: true } },
  linkedKeyword: true,
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include,
  });
  if (!post) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, post });
}

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

  const parsed = adminBlogPostUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const input = { ...parsed.data };
    if (input.status === 'PUBLISHED' && !input.publishedAt) {
      input.publishedAt = new Date();
    }
    const post = await updateBlogPostFromAdmin(id, input);
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error('[admin/blog PATCH]', e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Update failed',
      },
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

  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: { linkedKeyword: true },
  });
  if (!post) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  if (post.linkedKeyword) {
    await releaseKeywordFromDeletedOrUnlinkedPost(post.linkedKeyword.id, {
      hadTopicTitle: Boolean(post.linkedKeyword.assignedTopicTitle?.trim()),
    });
  }

  const slug = post.slug;
  await prisma.blogPost.delete({ where: { id } });
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  return NextResponse.json({ ok: true });
}
