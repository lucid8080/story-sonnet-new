import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { upsertStoryFromAdmin } from '@/lib/stories';
import {
  buildValidatedLibraryPayloadFromDraft,
  storyStudioDraftIncludeForLibrary,
} from '@/lib/story-studio/sync-linked-library-from-draft';
import { z } from 'zod';

const pushVisibilitySchema = z.object({
  visibility: z.enum(['public', 'private']).optional().default('public'),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parsedBody = pushVisibilitySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 });
  }
  const visibility = parsedBody.data.visibility;

  const { id } = await context.params;
  const order = await prisma.customStoryOrder.findUnique({
    where: { id },
    select: { id: true, userId: true, storyStudioDraftId: true },
  });
  if (!order?.storyStudioDraftId) {
    return NextResponse.json({ error: 'Order draft not found' }, { status: 404 });
  }
  if (order.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: order.storyStudioDraftId },
    include: storyStudioDraftIncludeForLibrary,
  });
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  if (!draft.episodes.length) {
    return NextResponse.json({ error: 'No episodes yet' }, { status: 400 });
  }

  const built = buildValidatedLibraryPayloadFromDraft(draft);
  if (!built.ok) {
    return NextResponse.json({ error: built.message }, { status: 400 });
  }

  let storyKey = draft.linkedStoryId?.toString();
  if (!storyKey) {
    const created = await prisma.story.create({
      data: {
        slug: built.payload.slug,
        seriesTitle: built.payload.seriesTitle,
        summary: built.payload.summary,
        ageRange: built.payload.ageRange,
        isSeries: built.payload.isSeries,
        isPublished: false,
        isPremium: false,
        isFeatured: false,
        isUserGenerated: true,
        ownerUserId: order.userId,
        access: visibility,
      },
    });
    await prisma.storyStudioDraft.update({
      where: { id: draft.id },
      data: { linkedStoryId: created.id },
    });
    storyKey = created.id.toString();
  }

  const story = await upsertStoryFromAdmin(storyKey, built.payload);
  await prisma.story.update({
    where: { id: story.id },
    data: {
      isUserGenerated: true,
      ownerUserId: order.userId,
      access: visibility,
    },
  });
  await prisma.customStoryOrder.update({
    where: { id: order.id },
    data: { storyId: story.id, status: 'completed' },
  });

  return NextResponse.json({
    ok: true,
    storyId: story.id.toString(),
    slug: story.slug,
  });
}
