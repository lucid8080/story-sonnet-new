import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canPlayEpisode } from '@/lib/audioEntitlement';
import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import {
  getPrivateAudioBucket,
  presignPrivateAudioGetUrl,
} from '@/lib/s3';

export const runtime = 'nodejs';

function isSubscribedFromSession(
  sub: string | null | undefined
): boolean {
  return sub === 'active' || sub === 'trialing';
}

/**
 * MP3s often live only in R2_PRIVATE_BUCKET while DB still has a public CDN URL that 404s.
 * When R2_PRIVATE_BUCKET is set and the legacy URL targets the same host as NEXT_PUBLIC_ASSETS_BASE_URL
 * under /audio/..., presign GET from the private bucket using that object key.
 */
async function tryPresignLegacyAudioFromPrivateBucket(
  legacyUrl: string
): Promise<string | null> {
  if (!process.env.R2_PRIVATE_BUCKET?.trim()) return null;

  const baseRaw =
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL?.trim().replace(/\/+$/, '') ?? '';
  if (!baseRaw) return null;

  if (!getPrivateAudioBucket()) return null;

  const resolved = resolvePublicAssetUrl(legacyUrl) ?? legacyUrl;
  let u: URL;
  try {
    u = new URL(resolved);
  } catch {
    return null;
  }

  if (!u.pathname.toLowerCase().startsWith('/audio/')) {
    return null;
  }

  let pub: URL;
  try {
    pub = new URL(baseRaw.includes('://') ? baseRaw : `https://${baseRaw}`);
  } catch {
    return null;
  }

  if (u.hostname !== pub.hostname) {
    return null;
  }

  const key = u.pathname.replace(/^\/+/, '');
  try {
    return await presignPrivateAudioGetUrl({ key });
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawId = searchParams.get('episodeId')?.trim();
  if (!rawId || !/^\d+$/.test(rawId)) {
    return NextResponse.json({ error: 'Invalid episodeId' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Audio API requires a configured database.' },
      { status: 503 }
    );
  }

  const episodeId = BigInt(rawId);
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { story: true },
  });

  if (!episode || !episode.story) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
  }

  if (!episode.isPublished || !episode.story.isPublished) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await auth();
  const isSubscribed = isSubscribedFromSession(
    session?.user?.subscriptionStatus
  );

  const canPlay = canPlayEpisode(
    episode.story.isPremium,
    episode.isPremium,
    episode.isFreePreview,
    isSubscribed
  );

  if (!canPlay) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const key = episode.audioStorageKey?.trim();
  const legacyUrl = episode.audioUrl?.trim();

  if (key) {
    try {
      const url = await presignPrivateAudioGetUrl({ key });
      return NextResponse.json({ url });
    } catch (e) {
      console.error('[audio/play] presign failed', e);
      return NextResponse.json(
        { error: 'Could not prepare audio URL' },
        { status: 500 }
      );
    }
  }

  if (legacyUrl) {
    const privateSigned = await tryPresignLegacyAudioFromPrivateBucket(legacyUrl);
    if (privateSigned) {
      return NextResponse.json({ url: privateSigned });
    }

    const url = resolvePublicAssetUrl(legacyUrl) ?? legacyUrl;
    return NextResponse.json({ url });
  }

  return NextResponse.json({ error: 'No audio for this episode' }, { status: 404 });
}
