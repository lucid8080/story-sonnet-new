import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { revalidateStoryCatalog } from '@/lib/revalidateStoryCatalog';
import { createDraftStory } from '@/lib/stories';

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const story = await createDraftStory();
    revalidateStoryCatalog(story.slug);
    return NextResponse.json({
      ok: true,
      id: story.id.toString(),
      slug: story.slug,
    });
  } catch (e) {
    console.error('[admin/stories POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Create failed' },
      { status: 500 }
    );
  }
}
