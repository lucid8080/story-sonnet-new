import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { executeImageGeneration } from '@/lib/generation/execute';
import { blogGenerateImageSchema } from '@/lib/validation/blogSchemas';
import { uploadBlogFeatureImageBuffer } from '@/lib/blog/ai/upload-feature-image';

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

  const parsed = blogGenerateImageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const {
    prompt,
    contentDirection,
    imageStyle,
    contentSummary,
    title,
    excerpt,
    keywords,
  } = parsed.data;

  const kwLine =
    keywords?.filter((k) => k.trim().length > 0).join(', ') ?? '';

  const enriched = [
    'Wide 16:9 blog hero image, no text in the image, family-friendly.',
    contentDirection?.trim()
      ? `Content direction (what to depict): ${contentDirection.trim()}`
      : '',
    imageStyle?.trim()
      ? `Visual style (medium, lighting, mood): ${imageStyle.trim()}`
      : '',
    title?.trim() ? `Title: ${title.trim()}` : '',
    excerpt?.trim() ? `Excerpt: ${excerpt.trim()}` : '',
    contentSummary?.trim()
      ? `Article summary for imagery: ${contentSummary.trim()}`
      : '',
    kwLine ? `Keywords: ${kwLine}` : '',
    prompt?.trim() ? `Additional notes: ${prompt.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { result: img } = await executeImageGeneration({
      toolKey: 'blog_generate_image',
      prompt: enriched,
    });
    if (!img.ok) {
      return NextResponse.json(
        { ok: false, error: img.message, reason: img.reason },
        { status: 422 }
      );
    }

    const blogSlug =
      (req.headers.get('x-blog-slug') || 'draft').trim() || 'draft';
    const uploaded = await uploadBlogFeatureImageBuffer({
      blogSlug,
      buffer: img.imageBuffer,
      mimeType: img.mimeType,
      fileNameHint: 'blog-feature.png',
    });

    return NextResponse.json({
      ok: true,
      fileUrl: uploaded.fileUrl,
      storageKey: uploaded.storageKey,
    });
  } catch (e) {
    console.error('[blog generate image]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Image failed' },
      { status: 500 }
    );
  }
}
