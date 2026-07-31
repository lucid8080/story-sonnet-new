import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { draftSlugFromTitle } from '@/lib/story-studio/draft-slug-from-title';
import { defaultGenerationRequest } from '@/lib/story-studio/normalize-request';
import { seedBriefFromStory } from '@/lib/story-studio/seed-brief-from-story';
import { isNumericDbStoryId } from '@/lib/stories';

/**
 * Find or create a Story Studio draft linked to this library story.
 * Used by Story Series → Story Brief so both surfaces share one brief JSON.
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is required' },
      { status: 503 }
    );
  }

  const { id: rawId } = await context.params;
  const id = decodeURIComponent(rawId);
  if (!isNumericDbStoryId(id)) {
    return NextResponse.json(
      {
        error:
          'Save this story to the database first (numeric id required) before opening Story Brief.',
      },
      { status: 400 }
    );
  }

  const storyId = BigInt(id);
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      slug: true,
      seriesTitle: true,
      summary: true,
      seriesTagline: true,
      ageRange: true,
      genre: true,
      mood: true,
      durationMinutes: true,
    },
  });

  if (!story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  const existing = await prisma.storyStudioDraft.findFirst({
    where: { linkedStoryId: storyId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      seriesTitle: true,
      slug: true,
      brief: true,
      request: true,
    },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      created: false,
      draftId: existing.id,
      seriesTitle: existing.seriesTitle,
      slug: existing.slug,
      brief: existing.brief,
      request: existing.request,
    });
  }

  const brief = seedBriefFromStory({
    seriesTitle: story.seriesTitle,
    summary: story.summary,
    seriesTagline: story.seriesTagline,
    ageRange: story.ageRange,
    genre: story.genre,
    mood: story.mood,
    durationMinutes: story.durationMinutes,
  });

  const seriesTitle = brief.seriesTitle;
  const slug =
    story.slug?.trim() || draftSlugFromTitle(seriesTitle);

  const draft = await prisma.storyStudioDraft.create({
    data: {
      seriesTitle,
      slug,
      mode: 'quick',
      request: defaultGenerationRequest() as object,
      brief: brief as object,
      linkedStoryId: storyId,
      createdByUserId: session.user.id ?? undefined,
    },
    select: {
      id: true,
      seriesTitle: true,
      slug: true,
      brief: true,
      request: true,
    },
  });

  return NextResponse.json({
    ok: true,
    created: true,
    draftId: draft.id,
    seriesTitle: draft.seriesTitle,
    slug: draft.slug,
    brief: draft.brief,
    request: draft.request,
  });
}
