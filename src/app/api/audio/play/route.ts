import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { userHasPremiumPlayback } from '@/lib/billing/premiumAccess';
import { canPlayEpisode } from '@/lib/audioEntitlement';
import { fetchStoryBySlug } from '@/lib/stories';
import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import { getResolvedCatalogEpisodeAudioSrc } from '@/lib/catalogAudio';
import {
  getPrivateAudioBucket,
  headPrivateAudioObjectExists,
  presignPrivateAudioGetUrl,
} from '@/lib/s3';

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

function extractAudioSlugFromUrl(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  try {
    const p = new URL(v).pathname;
    const m = p.match(/^\/audio\/([^/]+)\/episode-\d+\.mp3$/i);
    return m?.[1] ?? null;
  } catch {
    const path = v.split('?')[0]?.split('#')[0] ?? '';
    const m = path.match(/^\/audio\/([^/]+)\/episode-\d+\.mp3$/i);
    return m?.[1] ?? null;
  }
}

/**
 * All catalog/legacy audio paths are shaped like `/audio/<slug>/episode-n.mp3`.
 * If objects live only in the private bucket, presign using that key — no need for
 * NEXT_PUBLIC_ASSETS_BASE_URL hostname to match (private bucket is not a public CDN origin).
 */
async function tryPresignPrivateAudioByCatalogPath(
  legacyUrl: string
): Promise<string | null> {
  if (!getPrivateAudioBucket()) return null;

  const resolved = resolvePublicAssetUrl(legacyUrl) ?? legacyUrl;
  let pathname: string;
  try {
    pathname = new URL(resolved).pathname;
  } catch {
    const t = resolved.trim();
    if (!t.startsWith('/')) return null;
    pathname = (t.split('?')[0] ?? '').split('#')[0] ?? '';
  }
  if (pathname.includes('..')) return null;
  if (!pathname.toLowerCase().startsWith('/audio/')) return null;

  const key = pathname.replace(/^\/+/, '');
  if (!key) return null;

  try {
    return await presignPrivateAudioGetUrl({ key });
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawId = searchParams.get('episodeId')?.trim();
  const slug = searchParams.get('slug')?.trim() ?? '';
  const rawEpisodeNumber = searchParams.get('episodeNumber')?.trim() ?? '';
  const hasNumericEpisodeId = !!(rawId && /^\d+$/.test(rawId));
  const hasSlugEpisode = !!(slug && /^\d+$/.test(rawEpisodeNumber));
  if (!hasNumericEpisodeId && !hasSlugEpisode) {
    return NextResponse.json(
      { error: 'Provide episodeId OR slug+episodeNumber' },
      { status: 400 }
    );
  }

  const isSubscribed = await hasPremiumPlaybackFromSession();

  let requestEpisodeRef = rawId ?? `${slug}:${rawEpisodeNumber}`;
  let storySlug = '';
  let storyIsPremium = false;
  let episodeIsPremium = false;
  let episodeIsFreePreview = false;
  let episodeNumber = 0;
  let key = '';
  let legacyUrl = '';

  if (hasNumericEpisodeId) {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Audio API requires a configured database.' },
        { status: 503 }
      );
    }
    const episodeId = BigInt(rawId as string);
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

    storySlug = episode.story.slug;
    storyIsPremium = episode.story.isPremium;
    episodeIsPremium = episode.isPremium;
    episodeIsFreePreview = episode.isFreePreview;
    episodeNumber = episode.episodeNumber;
    key = episode.audioStorageKey?.trim() ?? '';
    legacyUrl = episode.audioUrl?.trim() ?? '';
  } else {
    const epNum = Number(rawEpisodeNumber);
    const story = await fetchStoryBySlug(slug);
    if (!story?.isPublished) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const ep = story.episodes.find((x) => x.episodeNumber === epNum);
    if (!ep || !ep.isPublished) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    requestEpisodeRef = `${slug}:${epNum}`;
    storySlug = story.slug;
    storyIsPremium = story.isPremium;
    episodeIsPremium = ep.isPremium;
    episodeIsFreePreview = ep.isFreePreview;
    episodeNumber = epNum;
    key = ep.audioStorageKey?.trim() ?? '';
    legacyUrl = ep.audioSrc?.trim() ?? '';
  }

  const canPlay = canPlayEpisode(
    storyIsPremium,
    episodeIsPremium,
    episodeIsFreePreview,
    isSubscribed
  );

  if (!canPlay) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const catalogUrl =
    getResolvedCatalogEpisodeAudioSrc(
      storySlug,
      episodeNumber
    )?.trim() ?? '';
  const legacySlug = extractAudioSlugFromUrl(legacyUrl);
  const catalogSlug = extractAudioSlugFromUrl(catalogUrl);
  const legacyLooksCrossStory = !!(legacySlug && legacySlug !== storySlug);
  const catalogLooksCrossStory = !!(catalogSlug && catalogSlug !== storySlug);
  const canonicalStoryUrl = resolvePublicAssetUrl(
    `/audio/${storySlug}/episode-${episodeNumber}.mp3`
  ) ?? `/audio/${storySlug}/episode-${episodeNumber}.mp3`;

  let effectiveLegacy = legacyUrl || catalogUrl;
  // Guard against bad copied seed URLs that point to another story's audio.
  if (legacyLooksCrossStory) {
    if (catalogUrl && !catalogLooksCrossStory) {
      effectiveLegacy = catalogUrl;
    } else {
      effectiveLegacy = canonicalStoryUrl;
    }
  }

  let storageKeyToPresign: string | null = null;
  if (key) {
    const exists = await headPrivateAudioObjectExists(key);
    if (exists) {
      storageKeyToPresign = key;
    }
  }

  if (storageKeyToPresign) {
    try {
      const url = await presignPrivateAudioGetUrl({ key: storageKeyToPresign });
      return NextResponse.json({ url });
    } catch (e) {
      console.error('[audio/play] presign failed', e);
      return NextResponse.json(
        { error: 'Could not prepare audio URL' },
        { status: 500 }
      );
    }
  }

  if (effectiveLegacy) {
    const privateSigned =
      await tryPresignPrivateAudioByCatalogPath(effectiveLegacy);
    if (privateSigned) {
      return NextResponse.json({ url: privateSigned });
    }

    const url = resolvePublicAssetUrl(effectiveLegacy) ?? effectiveLegacy;
    return NextResponse.json({ url });
  }

  if (key) {
    try {
      const url = await presignPrivateAudioGetUrl({ key });
      console.error(
        '[audio/play]',
        JSON.stringify({
          branch: 'presignLastResort',
          episodeId: requestEpisodeRef,
          storySlug,
          keyPrefix: key.slice(0, 48),
          note: 'HEAD was false or no catalog/legacy; presigning storage key anyway',
        })
      );
      return NextResponse.json({ url });
    } catch (e) {
      console.error('[audio/play] presign last-resort failed', e);
      return NextResponse.json(
        { error: 'Could not prepare audio URL' },
        { status: 500 }
      );
    }
  }

  console.error(
    '[audio/play]',
    JSON.stringify({
      branch: 'noAudio',
      episodeId: requestEpisodeRef,
      storySlug,
      hasCatalog: !!catalogUrl,
    })
  );
  return NextResponse.json({ error: 'No audio for this episode' }, { status: 404 });
}
