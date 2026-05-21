import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { revalidateStoryCatalog } from '@/lib/revalidateStoryCatalog';
import { duplicateStoryAdmin } from '@/lib/stories';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const story = await duplicateStoryAdmin(decodeURIComponent(id));
    revalidateStoryCatalog(story.slug);
    return NextResponse.json({
      ok: true,
      id: story.id.toString(),
      slug: story.slug,
    });
  } catch (e) {
    console.error('[admin/stories duplicate]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Duplicate failed' },
      { status: 500 }
    );
  }
}
