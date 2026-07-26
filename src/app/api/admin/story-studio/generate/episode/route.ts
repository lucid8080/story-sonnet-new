import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  buildOpenRouterMessagesForSingleEpisode,
  type SingleEpisodePromptContext,
} from '@/lib/story-studio/prompt-builder';
import { resolveDraftGenerationRequest } from '@/lib/story-studio/normalize-request';
import { getArtStylePromptOverrides } from '@/lib/story-studio/story-studio-settings';
import {
  parseJsonToScriptEpisode,
  type BriefPayloadParsed,
} from '@/lib/story-studio/schemas/llm-output';
import { z } from 'zod';
import { executeTextGeneration } from '@/lib/generation/execute';
import {
  TARGET_LENGTH_RANGE_IDS,
  maxTokensForTargetLengthRange,
  remapTargetLengthRange,
  scriptLengthOutOfRangeMessage,
} from '@/lib/story-studio/target-length';
import {
  isTagDensityId,
  stripExpressionBracketTags,
} from '@/lib/story-studio/tag-density';
import type { TagDensityId } from '@/lib/story-studio/types';

export const runtime = 'nodejs';

const TAIL_CHARS = 600;

const bodySchema = z
  .object({
    draftId: z.string().min(1),
    directions: z.string().optional().default(''),
    /** Optional one-shot length override for this generate (Add Episode). */
    targetLengthRange: z.enum(TARGET_LENGTH_RANGE_IDS).optional(),
    /** Optional expression-tag density override for this generate. */
    tagDensity: z
      .enum(['none', 'light', 'medium', 'expressive'])
      .optional(),
    position: z
      .union([
        z.literal('append'),
        z.object({ insertAfterSortOrder: z.number().int().min(0) }),
      ])
      .optional()
      .default('append'),
  })
  .strict();

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { draftId, directions, position, targetLengthRange, tagDensity } =
    parsedBody.data;

  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: draftId },
    include: {
      episodes: { orderBy: { sortOrder: 'asc' } },
      preset: true,
    },
  });

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const brief = draft.brief as BriefPayloadParsed | null;
  if (!brief) {
    return NextResponse.json(
      {
        error:
          'Generate a story brief first (Story Studio → Generate brief), then add episodes.',
      },
      { status: 400 }
    );
  }

  const baseReq = resolveDraftGenerationRequest(draft);
  const lengthRange = targetLengthRange
    ? remapTargetLengthRange(targetLengthRange)
    : baseReq.targetLengthRange;
  const density: TagDensityId =
    tagDensity && isTagDensityId(tagDensity)
      ? tagDensity
      : baseReq.tagDensity;
  // Force length + tag density into the prompt for this generate even if the
  // draft preset had those fields toggled off.
  const reqResolved = {
    ...baseReq,
    targetLengthRange: lengthRange,
    tagDensity: density,
    presetFieldEnabled: {
      ...baseReq.presetFieldEnabled,
      targetLengthRange: true,
      tagDensity: true,
    },
  };
  const artStyleOverrides = await getArtStylePromptOverrides(prisma);
  const eps = draft.episodes;
  const n = eps.length;

  let episodeIndex: number;
  let priorEps: typeof eps;

  if (position === 'append') {
    episodeIndex = n;
    priorEps = eps;
  } else {
    const after = position.insertAfterSortOrder;
    priorEps = eps.filter((e) => e.sortOrder <= after);
    episodeIndex = priorEps.length;
  }

  const totalEpisodesAfter = n + 1;

  const outline = brief.episodeOutline?.[episodeIndex] ?? null;
  const outlineBeat = outline
    ? { title: outline.title ?? '', beat: outline.beat ?? '' }
    : null;

  const priorEpisodes: SingleEpisodePromptContext['priorEpisodes'] =
    priorEps.map((e) => {
      const st = e.scriptText ?? '';
      const scriptTail =
        st.length <= TAIL_CHARS ? st : st.slice(-TAIL_CHARS);
      return {
        title: e.title,
        summary: e.summary?.trim() || '',
        scriptTail,
      };
    });

  const ctx: SingleEpisodePromptContext = {
    episodeIndex,
    totalEpisodesAfter,
    outlineBeat,
    priorEpisodes,
    directions,
  };

  const messages = buildOpenRouterMessagesForSingleEpisode(
    reqResolved,
    brief,
    ctx,
    artStyleOverrides
  );

  try {
    const { content: rawOut } = await executeTextGeneration({
      toolKey: 'story_studio_generate_episode',
      messages,
      maxTokens: maxTokensForTargetLengthRange(reqResolved.targetLengthRange),
      temperature: 0.88,
    });
    const parsed = parseJsonToScriptEpisode(rawOut);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Episode JSON invalid',
          details: parsed.error.flatten(),
          rawPreview: rawOut.slice(0, 500),
        },
        { status: 422 }
      );
    }
    let episode = parsed.data;
    if (reqResolved.tagDensity === 'none') {
      episode = {
        ...episode,
        scriptText: stripExpressionBracketTags(episode.scriptText),
      };
    }
    const lengthError = scriptLengthOutOfRangeMessage(
      'Episode',
      episode.scriptText.length,
      reqResolved.targetLengthRange
    );
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 422 });
    }
    return NextResponse.json({ ok: true, episode });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed';
    console.error('[story-studio/generate/episode]', e);
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
