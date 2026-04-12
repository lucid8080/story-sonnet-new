import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import {
  applyPresetDefaults,
  defaultGenerationRequest,
} from '@/lib/story-studio/normalize-request';
import { z } from 'zod';
import { draftSlugFromTitle } from '@/lib/story-studio/draft-slug-from-title';

const createBodySchema = z.object({
  presetId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
});

const draftListSelect = {
  id: true,
  title: true,
  slug: true,
  mode: true,
  updatedAt: true,
  linkedStoryId: true,
  assets: {
    where: { kind: 'cover' },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { publicUrl: true },
  },
} as const;

type DraftListRow = {
  id: string;
  title: string;
  slug: string;
  mode: string;
  updatedAt: Date;
  linkedStoryId: bigint | null;
  assets: { publicUrl: string | null }[];
};

function serializeDraftListRow(d: DraftListRow) {
  const rawCoverUrl = d.assets[0]?.publicUrl ?? null;
  const coverThumbnailUrl =
    resolvePublicAssetUrl(rawCoverUrl) ?? rawCoverUrl ?? null;
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    mode: d.mode,
    updatedAt: d.updatedAt,
    linkedStoryId: d.linkedStoryId?.toString() ?? null,
    coverThumbnailUrl,
  };
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [linkedDrafts, recentDrafts] = await Promise.all([
    prisma.storyStudioDraft.findMany({
      where: { linkedStoryId: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
      select: draftListSelect,
    }),
    prisma.storyStudioDraft.findMany({
      where: { linkedStoryId: null },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: draftListSelect,
    }),
  ]);

  return NextResponse.json({
    linkedDrafts: linkedDrafts.map(serializeDraftListRow),
    recentDrafts: recentDrafts.map(serializeDraftListRow),
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
      slug: draftSlugFromTitle(title),
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
