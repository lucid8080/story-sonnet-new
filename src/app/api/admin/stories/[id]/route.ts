import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { adminStoryUpsertSchema } from '@/lib/validation/storySchema';
import { deleteStoryAdmin, upsertStoryFromAdmin } from '@/lib/stories';

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

  const parsed = adminStoryUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const input = {
    ...parsed.data,
    publishedAt:
      parsed.data.publishedAt != null && parsed.data.publishedAt !== ''
        ? new Date(parsed.data.publishedAt).toISOString()
        : null,
  };

  try {
    const story = await upsertStoryFromAdmin(decodeURIComponent(id), input);
    const episodes = await prisma.episode.findMany({
      where: { storyId: story.id },
      select: { id: true, transcriptLines: true },
      orderBy: { episodeNumber: 'asc' },
    });
    const episodeTranscriptCounts: Record<string, number> = {};
    for (const ep of episodes) {
      const raw = ep.transcriptLines;
      const count =
        raw != null && Array.isArray(raw)
          ? raw.filter(
              (row) =>
                row &&
                typeof row === 'object' &&
                !Array.isArray(row) &&
                typeof (row as { text?: unknown }).text === 'string'
            ).length
          : 0;
      episodeTranscriptCounts[ep.id.toString()] = count;
    }
    return NextResponse.json({
      ok: true,
      id: story.id.toString(),
      slug: story.slug,
      episodeTranscriptCounts,
    });
  } catch (e) {
    console.error('[admin/stories PATCH]', e);
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
    await deleteStoryAdmin(decodeURIComponent(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/stories DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
