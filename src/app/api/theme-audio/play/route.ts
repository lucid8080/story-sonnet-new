import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { userHasPremiumPlayback } from '@/lib/billing/premiumAccess';
import { canPlayEpisode } from '@/lib/audioEntitlement';
import prisma from '@/lib/prisma';
import { fetchStoryBySlug } from '@/lib/stories';
import {
  presignPrivateAudioGetUrl,
  headPrivateAudioObjectExists,
} from '@/lib/s3';
import { themeAudioKeyCandidates } from '@/lib/themeAudioUrls';

export const runtime = 'nodejs';

async function hasPremiumPlaybackFromSession(): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return false;
  return userHasPremiumPlayback(prisma, {
    userId,
    subscriptionStatus: session?.user?.subscriptionStatus,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug')?.trim();
  const kind = searchParams.get('kind')?.trim();
  if (!slug || (kind !== 'intro' && kind !== 'full')) {
    return NextResponse.json({ error: 'Invalid slug or kind' }, { status: 400 });
  }

  const story = await fetchStoryBySlug(slug);
  if (!story?.isPublished) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const firstEp = story.episodes[0];
  if (!firstEp) {
    return NextResponse.json({ error: 'No episodes' }, { status: 404 });
  }

  const isSubscribed = await hasPremiumPlaybackFromSession();

  const canPlay = canPlayEpisode(
    story.isPremium,
    firstEp.isPremium,
    firstEp.isFreePreview,
    isSubscribed
  );

  if (!canPlay) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const keys = themeAudioKeyCandidates(slug, kind);
  for (const key of keys) {
    if (!(await headPrivateAudioObjectExists(key))) continue;
    try {
      const url = await presignPrivateAudioGetUrl({ key });
      return NextResponse.json({ url });
    } catch (e) {
      console.error('[theme-audio/play] presign failed', e);
      return NextResponse.json(
        { error: 'Could not prepare theme audio URL' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Theme audio not found' }, { status: 404 });
}
