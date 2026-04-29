import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { updateContentSpotlight } from '@/lib/content-spotlight/adminMutations';
import { isMissingContentSpotlightSchemaError } from '@/lib/content-spotlight/prismaSafeQuery';
import { SPOTLIGHT_SCHEMA_MISMATCH_JSON } from '@/lib/content-spotlight/spotlightAdminSchemaMismatch';
import { contentSpotlightUpsertSchema } from '@/lib/validation/contentSpotlightSchema';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  let row;
  try {
    row = await prisma.contentSpotlight.findUnique({
      where: { id },
      include: {
        stories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            story: {
              select: {
                id: true,
                slug: true,
                seriesTitle: true,
                coverUrl: true,
                isPublished: true,
              },
            },
          },
        },
        badgeAsset: true,
      },
    });
  } catch (e) {
    if (isMissingContentSpotlightSchemaError(e)) {
      return NextResponse.json(SPOTLIGHT_SCHEMA_MISMATCH_JSON, { status: 503 });
    }
    throw e;
  }
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    spotlight: {
      ...row,
      stories: row.stories.map((s) => ({
        ...s,
        storyId: s.storyId.toString(),
        story: {
          ...s.story,
          id: s.story.id.toString(),
        },
      })),
    },
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await context.params;

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
    const row = await updateContentSpotlight(id, parsed.data);
    return NextResponse.json({
      ok: true,
      spotlight: {
        ...row,
        stories: row.stories.map((s) => ({
          ...s,
          storyId: s.storyId.toString(),
          story: {
            ...s.story,
            id: s.story.id.toString(),
          },
        })),
      },
    });
  } catch (e) {
    console.error('[content-calendar spotlights PATCH]', e);
    if (isMissingContentSpotlightSchemaError(e)) {
      return NextResponse.json(SPOTLIGHT_SCHEMA_MISMATCH_JSON, { status: 503 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  try {
    await prisma.contentSpotlight.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[content-calendar spotlights DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
