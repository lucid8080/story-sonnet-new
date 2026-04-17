import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { openRouterChatCompletion } from '@/lib/story-studio/openrouter';
import { extractJsonObject } from '@/lib/blog/ai/parse-json';
import { blogAiSingleTopicPayloadSchema } from '@/lib/blog/ai/output-schemas';
import { buildSingleTopicFromKeywordMessage } from '@/lib/blog/ai/prompts';
import { blogBulkTopicSuggestionsSchema } from '@/lib/validation/blogKeywordSchemas';

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

  const parsed = blogBulkTopicSuggestionsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const keywords = await prisma.blogKeyword.findMany({
    where: { id: { in: parsed.data.keywordIds } },
  });

  const results: { keywordId: string; topic: unknown }[] = [];

  for (const kw of keywords) {
    try {
      const messages = buildSingleTopicFromKeywordMessage(kw.keyword);
      const rawOut = await openRouterChatCompletion({
        messages,
        maxTokens: 1500,
        temperature: 0.85,
      });
      const extracted = extractJsonObject(rawOut);
      const one = blogAiSingleTopicPayloadSchema.safeParse(JSON.parse(extracted));
      if (one.success) {
        results.push({ keywordId: kw.id, topic: one.data });
      } else {
        results.push({ keywordId: kw.id, topic: null });
      }
    } catch {
      results.push({ keywordId: kw.id, topic: null });
    }
  }

  return NextResponse.json({ ok: true, results });
}
