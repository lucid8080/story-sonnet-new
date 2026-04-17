import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { openRouterChatCompletion } from '@/lib/story-studio/openrouter';
import { extractJsonObject } from '@/lib/blog/ai/parse-json';
import {
  blogAiArticlePayloadSchema,
  blogAiRewritePayloadSchema,
} from '@/lib/blog/ai/output-schemas';
import {
  buildBlogKeywordsMessages,
  buildBlogRewriteMessages,
  buildBlogScratchMessages,
} from '@/lib/blog/ai/prompts';
import {
  blogGenerateFromKeywordsSchema,
  blogGenerateFromScratchSchema,
  blogGenerateRewriteSchema,
} from '@/lib/validation/blogSchemas';

const bodySchema = z.discriminatedUnion('mode', [
  z
    .object({ mode: z.literal('scratch') })
    .merge(blogGenerateFromScratchSchema),
  z
    .object({ mode: z.literal('keywords') })
    .merge(blogGenerateFromKeywordsSchema),
  z.object({ mode: z.literal('rewrite') }).merge(blogGenerateRewriteSchema),
]);

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const mode = parsed.data.mode;
    let messages;
    switch (parsed.data.mode) {
      case 'scratch': {
        const { mode: _m, ...rest } = parsed.data;
        messages = buildBlogScratchMessages(rest);
        break;
      }
      case 'keywords': {
        const { mode: _m, ...rest } = parsed.data;
        messages = buildBlogKeywordsMessages(rest);
        break;
      }
      case 'rewrite': {
        const { mode: _m, ...rest } = parsed.data;
        messages = buildBlogRewriteMessages(rest);
        break;
      }
      default:
        return NextResponse.json({ ok: false, error: 'Invalid mode' }, { status: 400 });
    }

    const rawOut = await openRouterChatCompletion({
      messages,
      maxTokens: 12000,
      temperature: mode === 'rewrite' ? 0.5 : 0.75,
    });

    const extracted = extractJsonObject(rawOut);

    if (mode === 'rewrite') {
      const out = blogAiRewritePayloadSchema.safeParse(JSON.parse(extracted));
      if (!out.success) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Invalid rewrite JSON',
            details: out.error.flatten(),
            rawPreview: rawOut.slice(0, 400),
          },
          { status: 422 }
        );
      }
      return NextResponse.json({ ok: true, mode, payload: out.data });
    }

    const out = blogAiArticlePayloadSchema.safeParse(JSON.parse(extracted));
    if (!out.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid article JSON',
          details: out.error.flatten(),
          rawPreview: rawOut.slice(0, 400),
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ ok: true, mode, payload: out.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed';
    console.error('[blog generate text]', e);
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
