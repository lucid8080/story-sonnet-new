import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { upsertStoryFromAdmin } from '@/lib/stories';
import {
  buildValidatedLibraryPayloadFromDraft,
  storyStudioDraftIncludeForLibrary,
} from '@/lib/story-studio/sync-linked-library-from-draft';
import { z } from 'zod';

const bodySchema = z.object({
  draftId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'draftId required', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: parsed.data.draftId },
    include: storyStudioDraftIncludeForLibrary,
  });

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  if (!draft.episodes.length) {
    return NextResponse.json(
      {
        error:
          'No episodes on this draft. Generate a script or add episode text before pushing to the library.',
      },
      { status: 400 }
    );
  }

  const built = buildValidatedLibraryPayloadFromDraft(draft);
  if (!built.ok) {
    return NextResponse.json({ error: built.message }, { status: 400 });
  }
  const payload = built.payload;

  try {
    let storyKey = draft.linkedStoryId?.toString();

    if (!storyKey) {
      const created = await prisma.story.create({
        data: {
          slug: payload.slug,
          seriesTitle: payload.seriesTitle,
          summary: payload.summary,
          ageRange: payload.ageRange,
          isSeries: payload.isSeries,
          isPublished: false,
          isPremium: false,
          isFeatured: false,
          popularityScore: 10,
          sortPriority: 0,
        },
      });
      await prisma.storyStudioDraft.update({
        where: { id: draft.id },
        data: { linkedStoryId: created.id },
      });
      storyKey = created.id.toString();
    }

    const story = await upsertStoryFromAdmin(storyKey, payload);

    return NextResponse.json({
      ok: true,
      storyId: story.id.toString(),
      slug: story.slug,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Push failed';
    console.error('[story-studio/push-to-library]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
