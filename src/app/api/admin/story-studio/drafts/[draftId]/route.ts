import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
  mergeGenerationRequest,
  parseStoredGenerationRequest,
} from '@/lib/story-studio/normalize-request';
import { STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE } from '@/lib/story-studio/constants';
import { generationRequestPatchSchema } from '@/lib/story-studio/schemas/request-schema';
import { importLibraryEpisodesIntoDraft } from '@/lib/story-studio/import-library-episodes';
import {
  draftInclude,
  serializeDraft,
} from '@/lib/story-studio/serialize-draft';
import { syncLinkedLibraryFromDraft } from '@/lib/story-studio/sync-linked-library-from-draft';
import { deleteStoryAdmin } from '@/lib/stories';

const deleteDraftBodySchema = z
  .object({
    deleteLinkedStory: z.boolean().optional(),
  })
  .strict();

const patchBodySchema = z
  .object({
    seriesTitle: z.string().min(1).max(200).optional(),
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
          scriptText: z
            .string()
            .max(STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE),
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

  if (draft.linkedStoryId != null) {
    await importLibraryEpisodesIntoDraft(draftId, draft.linkedStoryId);
    const refreshed = await prisma.storyStudioDraft.findUniqueOrThrow({
      where: { id: draftId },
      include: draftInclude,
    });
    return NextResponse.json({ draft: serializeDraft(refreshed) });
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

  if (parsed.data.seriesTitle != null) data.seriesTitle = parsed.data.seriesTitle;
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

    if (parsed.data.episodes !== undefined) {
      const existing = await tx.storyStudioDraftEpisode.findMany({
        where: { draftId },
        select: { id: true, notes: true },
      });
      const existingIds = new Set(existing.map((e) => e.id));
      const keptIds = new Set<string>();

      for (let i = 0; i < parsed.data.episodes.length; i++) {
        const ep = parsed.data.episodes[i];
        const sortOrder = ep.sortOrder ?? i;
        if (existingIds.has(ep.id)) {
          await tx.storyStudioDraftEpisode.update({
            where: { id: ep.id },
            data: {
              sortOrder,
              title: ep.title,
              scriptText: ep.scriptText,
              summary: ep.summary ?? null,
            },
          });
          keptIds.add(ep.id);
        } else {
          const created = await tx.storyStudioDraftEpisode.create({
            data: {
              id: ep.id,
              draftId,
              sortOrder,
              title: ep.title,
              scriptText: ep.scriptText,
              summary: ep.summary ?? null,
            },
          });
          keptIds.add(created.id);
        }
      }

      await tx.storyStudioDraftEpisode.deleteMany({
        where: {
          draftId,
          ...(keptIds.size > 0 ? { id: { notIn: [...keptIds] } } : {}),
        },
      });
    }
  });

  const shouldSyncLibrary =
    existing.linkedStoryId != null &&
    (parsed.data.episodes !== undefined ||
      parsed.data.scriptPackage !== undefined);

  let librarySync:
    | Awaited<ReturnType<typeof syncLinkedLibraryFromDraft>>
    | undefined;
  if (shouldSyncLibrary) {
    await importLibraryEpisodesIntoDraft(draftId, existing.linkedStoryId!);
    librarySync = await syncLinkedLibraryFromDraft(draftId);
  }

  const draft = await prisma.storyStudioDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: draftInclude,
  });

  return NextResponse.json({
    ok: true,
    draft: serializeDraft(draft),
    ...(librarySync ? { librarySync } : {}),
  });
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
