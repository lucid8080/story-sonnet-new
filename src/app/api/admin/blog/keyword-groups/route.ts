import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { slugifyBlogTitle, normalizeBlogSlug } from '@/lib/blog/slug';

const upsertSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const items = await prisma.blogKeywordGroup.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ ok: true, items });
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
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const slug = parsed.data.slug
    ? normalizeBlogSlug(parsed.data.slug)
    : normalizeBlogSlug(slugifyBlogTitle(parsed.data.name));
  const item = await prisma.blogKeywordGroup.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
    },
  });
  return NextResponse.json({ ok: true, item });
}
