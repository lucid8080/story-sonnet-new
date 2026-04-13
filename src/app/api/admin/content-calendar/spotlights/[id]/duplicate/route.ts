import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { duplicateContentSpotlight } from '@/lib/content-spotlight/adminMutations';

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
    const row = await duplicateContentSpotlight(id);
    return NextResponse.json({
      ok: true,
      spotlight: {
        ...row,
        stories: row.stories.map((s) => ({
          ...s,
          storyId: s.storyId.toString(),
        })),
      },
    });
  } catch (e) {
    console.error('[content-calendar duplicate]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Duplicate failed' },
      { status: 500 }
    );
  }
}
