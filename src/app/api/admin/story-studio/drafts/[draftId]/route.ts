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
import {
  draftInclude,
  serializeDraft,
} from '@/lib/story-studio/serialize-draft';
import { deleteStoryAdmin } from '@/lib/stories';

const deleteDraftBodySchema = z
  .object({
    deleteLinkedStory: z.boolean().optional(),
  })
  .strict();

const patchBodySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug: lowercase letters, numbers, hyphens')
      .optional(),
    mode: z.enum(['quick', 'prompt']).optional(),
    presetId: z.string().nullable().optional(),
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

export async function GET(
  _req: Request,
  context: { params: Promise<{ draftId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { draftId } = await context.params;
  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: draftId },
    include: draftInclude,
  });

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  return NextResponse.json({ draft: serializeDraft(draft) });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ draftId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { draftId } = await context.params;
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
    where: { id: draftId },
    include: { preset: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const data: Prisma.StoryStudioDraftUncheckedUpdateInput = {};

  if (parsed.data.title != null) data.title = parsed.data.title;
  if (parsed.data.slug != null) data.slug = parsed.data.slug;
  if (parsed.data.mode != null) data.mode = parsed.data.mode;
  if (parsed.data.presetId !== undefined) {
    data.presetId = parsed.data.presetId;
  }

  if (parsed.data.request) {
    const current = parseStoredGenerationRequest(existing.request);
    const next = mergeGenerationRequest(current, parsed.data.request);
    data.request = next as Prisma.InputJsonValue;
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
      where: { id: draftId },
      data,
    });

    if (parsed.data.episodes?.length) {
      await tx.storyStudioDraftEpisode.deleteMany({ where: { draftId } });
      for (let i = 0; i < parsed.data.episodes.length; i++) {
        const ep = parsed.data.episodes[i];
        await tx.storyStudioDraftEpisode.create({
          data: {
            draftId,
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
    where: { id: draftId },
    include: draftInclude,
  });

  return NextResponse.json({ ok: true, draft: serializeDraft(draft) });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ draftId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { draftId } = await context.params;

  let deleteLinkedStory = false;
  try {
    const body: unknown = await req.json();
    const parsed = deleteDraftBodySchema.safeParse(body);
    if (parsed.success) {
      deleteLinkedStory = parsed.data.deleteLinkedStory === true;
    }
  } catch {
    /* no JSON body */
  }

  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: draftId },
    select: { id: true, linkedStoryId: true },
  });
  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  try {
    if (deleteLinkedStory && draft.linkedStoryId != null) {
      await deleteStoryAdmin(draft.linkedStoryId.toString());
    }
    await prisma.storyStudioDraft.deleteMany({ where: { id: draftId } });
  } catch (e) {
    console.error('[story-studio/drafts DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Delete failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
