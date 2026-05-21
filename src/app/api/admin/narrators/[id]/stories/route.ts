import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  fetchNarratorAssignedStoryIds,
  syncNarratorStories,
} from '@/lib/narrators';
import { adminNarratorStoriesSchema } from '@/lib/validation/narratorSchema';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  try {
    const storyIds = await fetchNarratorAssignedStoryIds(decodeURIComponent(id));
    return NextResponse.json({ ok: true, storyIds });
  } catch (e) {
    console.error('[admin/narrators/[id]/stories GET]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Load failed' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = adminNarratorStoriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  try {
    await syncNarratorStories(decodeURIComponent(id), parsed.data.storyIds);
    return NextResponse.json({ ok: true, storyIds: parsed.data.storyIds });
  } catch (e) {
    console.error('[admin/narrators/[id]/stories PUT]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Save failed' },
      { status: 500 }
    );
  }
}
