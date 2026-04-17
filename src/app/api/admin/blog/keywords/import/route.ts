import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { bulkImportKeywordsSchema } from '@/lib/validation/blogKeywordSchemas';
import { parseKeywordListInput, normalizeKeywordPhrase } from '@/lib/blog/keyword-normalize';

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
  const parsed = bulkImportKeywordsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const phrases = parseKeywordListInput(parsed.data.raw);
  let created = 0;
  let skipped = 0;

  for (const phrase of phrases) {
    const normalizedKeyword = normalizeKeywordPhrase(phrase);
    if (!normalizedKeyword) continue;
    const exists = await prisma.blogKeyword.findUnique({
      where: { normalizedKeyword },
    });
    if (exists) {
      skipped += 1;
      continue;
    }
    try {
      const data: Prisma.BlogKeywordCreateInput = {
        keyword: phrase.trim(),
        normalizedKeyword,
        priority: parsed.data.priority ?? 'MEDIUM',
        sourceType: 'IMPORTED',
        ...(parsed.data.categoryId
          ? { category: { connect: { id: parsed.data.categoryId } } }
          : {}),
        ...(parsed.data.groupId
          ? { group: { connect: { id: parsed.data.groupId } } }
          : {}),
      };
      await prisma.blogKeyword.create({ data });
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  return NextResponse.json({ ok: true, created, skipped, total: phrases.length });
}
