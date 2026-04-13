import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  createContentSpotlight,
} from '@/lib/content-spotlight/adminMutations';
import { isMissingContentSpotlightSchemaError } from '@/lib/content-spotlight/prismaSafeQuery';
import { SPOTLIGHT_SCHEMA_MISMATCH_JSON } from '@/lib/content-spotlight/spotlightAdminSchemaMismatch';
import { contentSpotlightUpsertSchema } from '@/lib/validation/contentSpotlightSchema';

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const where =
    status && status !== 'all'
      ? { status: status as 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' }
      : {};

  let rows;
  try {
    rows = await prisma.contentSpotlight.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: {
        stories: { select: { storyId: true, sortOrder: true } },
        badgeAsset: { select: { id: true, publicUrl: true, altText: true } },
      },
    });
  } catch (e) {
    if (isMissingContentSpotlightSchemaError(e)) {
      return NextResponse.json(SPOTLIGHT_SCHEMA_MISMATCH_JSON, { status: 503 });
    }
    throw e;
  }

  return NextResponse.json({
    ok: true,
    spotlights: rows.map((r) => ({
      ...r,
      stories: r.stories.map((s) => ({
        ...s,
        storyId: s.storyId.toString(),
      })),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = contentSpotlightUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const row = await createContentSpotlight(parsed.data);
    return NextResponse.json({
      ok: true,
      spotlight: {
        ...row,
        stories: row.stories.map((s) => ({
          ...s,
          storyId: s.storyId.toString(),
        })),
      },
    });
  } catch (e) {
    console.error('[content-calendar spotlights POST]', e);
    if (isMissingContentSpotlightSchemaError(e)) {
      return NextResponse.json(SPOTLIGHT_SCHEMA_MISMATCH_JSON, { status: 503 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Create failed' },
      { status: 500 }
    );
  }
}
