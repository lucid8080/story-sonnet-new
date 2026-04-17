import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { openRouterChatCompletion } from '@/lib/story-studio/openrouter';
import { extractJsonObject } from '@/lib/blog/ai/parse-json';
import { blogAiTopicIdeasPayloadSchema } from '@/lib/blog/ai/output-schemas';
import { buildTopicIdeasMessages } from '@/lib/blog/ai/prompts';
import { generateTopicsFromKeywordSchema } from '@/lib/validation/blogKeywordSchemas';

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = generateTopicsFromKeywordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const kw = await prisma.blogKeyword.findUnique({
    where: { id: parsed.data.keywordId },
  });
  if (!kw) {
    return NextResponse.json({ ok: false, error: 'Keyword not found' }, { status: 404 });
  }

  try {
    const messages = buildTopicIdeasMessages(kw.keyword);
    const rawOut = await openRouterChatCompletion({
      messages,
      maxTokens: 4000,
      temperature: 0.85,
    });
    const extracted = extractJsonObject(rawOut);
    const out = blogAiTopicIdeasPayloadSchema.safeParse(JSON.parse(extracted));
    if (!out.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid topics JSON',
          details: out.error.flatten(),
          rawPreview: rawOut.slice(0, 400),
        },
        { status: 422 }
      );
    }

    await prisma.blogKeyword.update({
      where: { id: kw.id },
      data: {
        status: 'TOPIC_CREATED',
        lastGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, topics: out.data.topics });
  } catch (e) {
    console.error('[generate-topics]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 422 }
    );
  }
}
