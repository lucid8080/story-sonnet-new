import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  customStoryFinalizeIdeaSchema,
  defaultCustomStoryStudioSetup,
  orderInputToGenerationPatch,
} from '@/lib/custom-stories/schemas';
import {
  CUSTOM_STORY_STATUS,
  normalizePackageType,
  resolveEpisodeCountForPackage,
} from '@/lib/custom-stories/config';
import {
  PREPURCHASE_IDEA_PLACEHOLDER,
  deriveSeriesTitleFromSimpleIdea,
} from '@/lib/custom-stories/service';
import { draftSlugFromTitle } from '@/lib/story-studio/draft-slug-from-title';
import {
  mergeGenerationRequest,
  parseStoredGenerationRequest,
} from '@/lib/story-studio/normalize-request';
import type { GenerationRequestPatch } from '@/lib/story-studio/schemas/request-schema';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = customStoryFinalizeIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const order = await prisma.customStoryOrder.findUnique({
    where: { id },
    include: { storyStudioDraft: true },
  });
  if (!order || !order.storyStudioDraftId || !order.storyStudioDraft) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  const isOwner = order.userId === session.user.id;
  const isAdmin = session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (
    order.status === CUSTOM_STORY_STATUS.COMPLETED ||
    order.status === CUSTOM_STORY_STATUS.GENERATING
  ) {
    return NextResponse.json(
      { error: 'This order can no longer be edited.' },
      { status: 409 }
    );
  }

  const simpleIdea = parsed.data.simpleIdea.trim();
  const draftTitle = deriveSeriesTitleFromSimpleIdea(simpleIdea);
  const packageType = normalizePackageType(order.packageType);
  const episodeCount = resolveEpisodeCountForPackage(packageType, order.episodeCount);
  const existingInputs = ((order.inputs ?? {}) as Record<string, unknown>) || {};
  const studioSetup =
    typeof existingInputs.studioSetup === 'object' &&
    existingInputs.studioSetup !== null
      ? (existingInputs.studioSetup as Record<string, unknown>)
      : defaultCustomStoryStudioSetup;
  const mergedPatch = orderInputToGenerationPatch({
    packageType,
    episodeCount,
    nfcRequested: parsed.data.nfcRequested ?? order.nfcRequested,
    title: draftTitle,
    storySlug: draftSlugFromTitle(draftTitle),
    simpleIdea,
    studioSetup: {
      ...defaultCustomStoryStudioSetup,
      ...studioSetup,
    },
  });
  const request = mergeGenerationRequest(
    parseStoredGenerationRequest(order.storyStudioDraft.request),
    {
      ...mergedPatch,
      format: episodeCount > 1 ? 'mini-series' : 'standalone',
      targetLengthRange: '4-5',
      episodeCount,
    } as GenerationRequestPatch
  );

  const nextInputs = {
    ...(existingInputs as Record<string, unknown>),
    packageType,
    episodeCount,
    nfcRequested: parsed.data.nfcRequested ?? order.nfcRequested,
    title: draftTitle,
    storySlug: draftSlugFromTitle(draftTitle),
    simpleIdea,
    studioSetup: {
      ...defaultCustomStoryStudioSetup,
      ...studioSetup,
    },
  };
  if (nextInputs.simpleIdea === PREPURCHASE_IDEA_PLACEHOLDER) {
    nextInputs.simpleIdea = simpleIdea;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.customStoryOrder.update({
      where: { id: order.id },
      data: {
        nfcRequested: parsed.data.nfcRequested ?? order.nfcRequested,
        inputs: nextInputs as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.storyStudioDraft.update({
      where: { id: order.storyStudioDraftId! },
      data: {
        seriesTitle: draftTitle,
        slug: draftSlugFromTitle(draftTitle),
        request: request as unknown as Prisma.InputJsonValue,
      },
    });
    return updatedOrder;
  });

  return NextResponse.json({
    ok: true,
    order: {
      id: updated.id,
      status: updated.status,
      nfcRequested: updated.nfcRequested,
    },
  });
}
