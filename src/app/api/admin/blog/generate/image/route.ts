import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateStoryCoverImage } from '@/lib/story-studio/vendors/image-generation';
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

  const { prompt, title, excerpt, keywords } = parsed.data;
  const enriched = [
    'Wide 16:9 blog hero image, no text in the image, family-friendly illustration or photography style.',
    prompt,
    title ? `Title context: ${title}` : '',
    excerpt ? `Excerpt: ${excerpt}` : '',
    keywords?.length ? `Keywords: ${keywords.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const img = await generateStoryCoverImage({ prompt: enriched });
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
