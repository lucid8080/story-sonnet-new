import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { runStoryStudioStep } from '@/lib/story-studio/orchestration/run-step';
import {
  draftInclude,
  serializeDraft,
} from '@/lib/story-studio/serialize-draft';

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
  context: { params: Promise<{ step: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { step } = await context.params;
  if (!ALLOWED.has(step)) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  let body: { draftId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const draftId = body.draftId?.trim();
  if (!draftId) {
    return NextResponse.json({ error: 'draftId required' }, { status: 400 });
  }

  try {
    await runStoryStudioStep(draftId, step);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed';
    console.error('[story-studio/generate]', step, e);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 422 }
    );
  }

  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: draftId },
    include: draftInclude,
  });

  if (!draft) {
    return NextResponse.json({ ok: true, draft: null });
  }

  return NextResponse.json({
    ok: true,
    draft: serializeDraft(draft),
  });
}
