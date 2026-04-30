import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { elevenLabsListVoices } from '@/lib/story-studio/vendors/elevenlabs';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const voices = await elevenLabsListVoices();
  if (!voices.ok) {
    return NextResponse.json(
      { error: voices.message, reason: voices.reason },
      { status: voices.reason === 'not_configured' ? 400 : 502 }
    );
  }

  return NextResponse.json({ ok: true, voices: voices.voices });
}
