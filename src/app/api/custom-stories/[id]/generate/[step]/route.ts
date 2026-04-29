import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  runStoryStudioStep,
  type ExecuteGenerationStepOptions,
} from '@/lib/story-studio/orchestration/run-step';
import { draftInclude, serializeDraft } from '@/lib/story-studio/serialize-draft';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'brief',
  'script',
  'cover',
  'theme_full',
  'theme_intro',
  'tts',
  'package',
]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; step: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, step } = await context.params;
  if (!ALLOWED.has(step)) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  const order = await prisma.customStoryOrder.findUnique({
    where: { id },
    select: { id: true, userId: true, storyStudioDraftId: true },
  });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  const isOwner = order.userId === session.user.id;
  const isAdmin = session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!order.storyStudioDraftId) {
    return NextResponse.json({ error: 'No linked story draft' }, { status: 400 });
  }

  let body: { draftEpisodeId?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  const episodeId = body.draftEpisodeId?.trim();
  const genOpts: ExecuteGenerationStepOptions | undefined =
    step === 'tts' && episodeId ? { draftEpisodeId: episodeId } : undefined;

  let stepResult: Awaited<ReturnType<typeof runStoryStudioStep>> | null = null;
  try {
    stepResult = await runStoryStudioStep(order.storyStudioDraftId, step, genOpts);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Generation failed' },
      { status: 422 }
    );
  }

  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: order.storyStudioDraftId },
    include: draftInclude,
  });

  return NextResponse.json({
    ok: true,
    draft: draft ? serializeDraft(draft) : null,
    ...((step === 'tts' || step === 'package') && stepResult?.librarySync
      ? { librarySync: stepResult.librarySync }
      : {}),
  });
}
