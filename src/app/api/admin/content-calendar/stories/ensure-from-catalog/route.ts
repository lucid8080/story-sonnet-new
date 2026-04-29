import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { updateStoryMeta } from '@/lib/stories';

export const runtime = 'nodejs';

const bodySchema = z.object({
  slug: z.string().min(1).transform((s) => s.trim().toLowerCase()),
});

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const row = await updateStoryMeta({ id: parsed.data.slug });
    return NextResponse.json({
      ok: true,
      story: {
        id: row.id.toString(),
        slug: row.slug,
        title: row.seriesTitle,
        seriesTitle: row.seriesTitle,
        coverUrl: row.coverUrl,
        isPublished: row.isPublished,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ensure failed' },
      { status: 400 }
    );
  }
}
