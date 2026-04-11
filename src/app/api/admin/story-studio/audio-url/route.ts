import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { presignPrivateAudioGetUrl } from '@/lib/s3';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key')?.trim() ?? '';
  if (!key) {
    return NextResponse.json({ error: 'key required' }, { status: 400 });
  }

  try {
    const url = await presignPrivateAudioGetUrl({ key });
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not prepare audio URL';
    console.error('[story-studio/audio-url]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

