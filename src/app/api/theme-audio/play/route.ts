import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { userHasPremiumPlayback } from '@/lib/billing/premiumAccess';
import { canPlayEpisode } from '@/lib/audioEntitlement';
import prisma from '@/lib/prisma';
import { fetchStoryBySlug } from '@/lib/stories';
import { presignPrivateAudioGetUrl } from '@/lib/s3';
import {
  firstExistingPrivateThemeKey,
} from '@/lib/themeAudioUrls';

export const runtime = 'nodejs';

function extractAudioSlugFromPathLike(input: string | null | undefined): string | null {
  const v = input?.trim();
  if (!v) return null;
  try {
    const p = new URL(v).pathname;
    const m = p.match(/^\/audio\/([^/]+)\//i);
    return m?.[1] ?? null;
  } catch {
    const normalized = v.split('?')[0]?.split('#')[0] ?? '';
    const m = normalized.match(/^\/?audio\/([^/]+)\//i);
    return m?.[1] ?? null;
  }
}

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
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug')?.trim();
  const kind = searchParams.get('kind')?.trim();
  if (!slug || (kind !== 'intro' && kind !== 'full')) {
    return NextResponse.json({ error: 'Invalid slug or kind' }, { status: 400 });
  }

  const story = await fetchStoryBySlug(slug, {
    viewerUserId: session?.user?.id ?? null,
    viewerRole: session?.user?.role ?? null,
  });
  if (!story) {
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

  const slugAliases = new Set<string>();
  for (const ep of story.episodes) {
    const fromKey = extractAudioSlugFromPathLike(ep.audioStorageKey ?? null);
    const fromUrl = extractAudioSlugFromPathLike(ep.audioSrc ?? null);
    for (const candidate of [fromKey, fromUrl]) {
      if (candidate && candidate !== slug) slugAliases.add(candidate);
    }
  }
  const key = await firstExistingPrivateThemeKey(slug, kind, Array.from(slugAliases));
  if (!key) {
    return NextResponse.json({ error: 'Theme audio not found' }, { status: 404 });
  }
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
