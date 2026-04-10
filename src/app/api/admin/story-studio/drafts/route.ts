import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  applyPresetDefaults,
  defaultGenerationRequest,
} from '@/lib/story-studio/normalize-request';
import { z } from 'zod';

const createBodySchema = z.object({
  presetId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
});

function draftSlugSeed() {
  return 'untitled-draft';
}

function slugFromTitle(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return s || draftSlugSeed();
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const drafts = await prisma.storyStudioDraft.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 40,
    select: {
      id: true,
      title: true,
      slug: true,
      mode: true,
      updatedAt: true,
      linkedStoryId: true,
    },
  });

  return NextResponse.json({
    drafts: drafts.map((d) => ({
      ...d,
      linkedStoryId: d.linkedStoryId?.toString() ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let requestJson = defaultGenerationRequest() as object;
  let presetId: string | null = null;

  if (parsed.data.presetId) {
    const preset = await prisma.storyStudioPreset.findUnique({
      where: { id: parsed.data.presetId },
    });
    if (preset) {
      presetId = preset.id;
      const merged = applyPresetDefaults(
        defaultGenerationRequest(),
        preset.defaults as Record<string, unknown>
      );
      requestJson = merged as object;
    }
  }

  const title = parsed.data.title ?? 'Untitled draft';
  const draft = await prisma.storyStudioDraft.create({
    data: {
      title,
      slug: slugFromTitle(title),
      mode: 'quick',
      presetId,
      request: requestJson,
      createdByUserId: session.user.id ?? undefined,
    },
  });

  return NextResponse.json({
    ok: true,
    draft: { id: draft.id, slug: draft.slug, title: draft.title },
  });
}
