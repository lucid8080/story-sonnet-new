import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { executeImageGeneration, executeTextGeneration } from '@/lib/generation/execute';
import { extractJsonObject } from '@/lib/blog/ai/parse-json';
import { blogAiArticlePayloadSchema } from '@/lib/blog/ai/output-schemas';
import { buildBlogScratchMessages } from '@/lib/blog/ai/prompts';
import { blogGenerateFromScratchSchema } from '@/lib/validation/blogSchemas';
import { uploadBlogFeatureImageBuffer } from '@/lib/blog/ai/upload-feature-image';

const bodySchema = z
  .object({
    generateImage: z.boolean().optional(),
    blogSlug: z.string().min(1).max(200).optional(),
  })
  .merge(blogGenerateFromScratchSchema);

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

  const { generateImage, blogSlug: slugHint, ...scratch } = parsed.data;
  const messages = buildBlogScratchMessages(scratch);

  try {
    const { content: rawOut } = await executeTextGeneration({
      toolKey: 'blog_generate_text',
      messages,
      maxTokens: 12000,
      temperature: 0.78,
    });
    const extracted = extractJsonObject(rawOut);
    const article = blogAiArticlePayloadSchema.safeParse(JSON.parse(extracted));
    if (!article.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid article JSON',
          details: article.error.flatten(),
          rawPreview: rawOut.slice(0, 400),
        },
        { status: 422 }
      );
    }

    let image:
      | { fileUrl: string; storageKey: string }
      | undefined;

    if (generateImage && article.data.imagePrompt) {
      const { result: img } = await executeImageGeneration({
        toolKey: 'blog_generate_image',
        prompt: article.data.imagePrompt,
      });
      if (img.ok) {
        const blogSlug =
          slugHint?.trim() ||
          scratch.topic
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60) || 'draft';
        image = await uploadBlogFeatureImageBuffer({
          blogSlug,
          buffer: img.imageBuffer,
          mimeType: img.mimeType,
          fileNameHint: 'blog-feature.png',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      payload: article.data,
      image,
    });
  } catch (e) {
    console.error('[blog generate full]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Full generation failed' },
      { status: 422 }
    );
  }
}
