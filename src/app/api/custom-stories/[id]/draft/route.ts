import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
  mergeGenerationRequest,
  parseStoredGenerationRequest,
} from '@/lib/story-studio/normalize-request';
import { generationRequestPatchSchema } from '@/lib/story-studio/schemas/request-schema';
import { draftInclude, serializeDraft } from '@/lib/story-studio/serialize-draft';

const patchBodySchema = z
  .object({
    seriesTitle: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    request: generationRequestPatchSchema.optional(),
    brief: z.unknown().optional(),
    scriptPackage: z.unknown().optional(),
    episodes: z
      .array(
        z.object({
          id: z.string(),
          title: z.string().min(1),
          scriptText: z.string(),
          summary: z.string().nullable().optional(),
          sortOrder: z.number().int().min(0).optional(),
        })
      )
      .optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;

  const order = await prisma.customStoryOrder.findUnique({
    where: { id },
    select: { userId: true, storyStudioDraftId: true },
  });
  if (!order?.storyStudioDraftId) {
    return NextResponse.json({ error: 'Order draft not found' }, { status: 404 });
  }
  if (order.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.storyStudioDraft.findUnique({
    where: { id: order.storyStudioDraftId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const data: Prisma.StoryStudioDraftUncheckedUpdateInput = {};
  if (parsed.data.seriesTitle != null) data.seriesTitle = parsed.data.seriesTitle;
  if (parsed.data.slug != null) data.slug = parsed.data.slug;
  if (parsed.data.request) {
    const current = parseStoredGenerationRequest(existing.request);
    data.request = mergeGenerationRequest(
      current,
      parsed.data.request
    ) as unknown as Prisma.InputJsonValue;
  }
  if (parsed.data.brief !== undefined) {
    data.brief =
      parsed.data.brief === null
        ? Prisma.DbNull
        : (parsed.data.brief as Prisma.InputJsonValue);
  }
  if (parsed.data.scriptPackage !== undefined) {
    data.scriptPackage =
      parsed.data.scriptPackage === null
        ? Prisma.DbNull
        : (parsed.data.scriptPackage as Prisma.InputJsonValue);
  }

  await prisma.$transaction(async (tx) => {
    await tx.storyStudioDraft.update({
      where: { id: order.storyStudioDraftId! },
      data,
    });
    if (parsed.data.episodes?.length) {
      await tx.storyStudioDraftEpisode.deleteMany({
        where: { draftId: order.storyStudioDraftId! },
      });
      for (let i = 0; i < parsed.data.episodes.length; i += 1) {
        const ep = parsed.data.episodes[i];
        await tx.storyStudioDraftEpisode.create({
          data: {
            draftId: order.storyStudioDraftId!,
            sortOrder: ep.sortOrder ?? i,
            title: ep.title,
            scriptText: ep.scriptText,
            summary: ep.summary ?? null,
          },
        });
      }
    }
  });

  const draft = await prisma.storyStudioDraft.findUniqueOrThrow({
    where: { id: order.storyStudioDraftId },
    include: draftInclude,
  });

  return NextResponse.json({ ok: true, draft: serializeDraft(draft) });
}
