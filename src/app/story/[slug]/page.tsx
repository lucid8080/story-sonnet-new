import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { userHasPremiumPlayback } from '@/lib/billing/premiumAccess';
import { attachThemeAudioToPlayerStory } from '@/lib/attachThemeAudioToPlayerStory';
import {
  probeThemeAudioAvailability,
  resolvePrivateThemeUrlsForViewer,
} from '@/lib/themeAudioUrls';
import { canPlayEpisode } from '@/lib/audioEntitlement';
import { fetchStories, fetchStoryBySlug, storyToPlayerPayload } from '@/lib/stories';
import {
  resolveStorySpotlightBadge,
  resolveStorySpotlightInfoBar,
} from '@/lib/content-spotlight/resolve';
import { StoryPageClient } from '@/components/story/StoryPageClient';

type RecommendedStory = {
  slug: string;
  title: string;
  cover: string | null;
  accent: string | null;
};

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

function collectThemeSlugAliases(storySlug: string, story: Awaited<ReturnType<typeof fetchStoryBySlug>>): string[] {
  if (!story) return [];
  const aliases = new Set<string>();
  for (const ep of story.episodes) {
    const fromKey = extractAudioSlugFromPathLike(ep.audioStorageKey ?? null);
    const fromUrl = extractAudioSlugFromPathLike(ep.audioSrc ?? null);
    for (const candidate of [fromKey, fromUrl]) {
      if (candidate && candidate !== storySlug) aliases.add(candidate);
    }
  }
  return Array.from(aliases);
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const isSignedIn = Boolean(session?.user);
  const userId = session?.user?.id;
  const story = await fetchStoryBySlug(slug, {
    viewerUserId: userId ?? null,
    viewerRole: session?.user?.role ?? null,
  });
  if (!story) notFound();
  const sub = session?.user?.subscriptionStatus;
  const isSubscribed =
    userId != null
      ? await userHasPremiumPlayback(prisma, { userId, subscriptionStatus: sub })
      : false;

  const playerStory = storyToPlayerPayload(story, isSubscribed);
  const themeSlugAliases = collectThemeSlugAliases(slug, story);
  const themeProbe = await probeThemeAudioAvailability(slug, themeSlugAliases);
  const firstEp = playerStory.episodes[0];
  const canPlayTheme =
    !!firstEp &&
    canPlayEpisode(
      playerStory.isPremium,
      firstEp.isPremium,
      firstEp.isFreePreview,
      isSubscribed
    );
  const themeProbeForViewer = await resolvePrivateThemeUrlsForViewer(
    slug,
    themeProbe,
    canPlayTheme,
    themeSlugAliases
  );
  const playerWithTheme = attachThemeAudioToPlayerStory(
    playerStory,
    themeProbeForViewer
  );
  const storyId = BigInt(story.id);
  const [spotlightBadge, spotlightInfoBar] = await Promise.all([
    resolveStorySpotlightBadge(storyId),
    resolveStorySpotlightInfoBar(storyId),
  ]);

  const allStories = await fetchStories();
  const recommendedStories: RecommendedStory[] = allStories
    .filter((candidate) => candidate.slug !== story.slug)
    .sort((a, b) => {
      const aGenreMatch = a.genre && story.genre && a.genre === story.genre ? 1 : 0;
      const bGenreMatch = b.genre && story.genre && b.genre === story.genre ? 1 : 0;
      if (aGenreMatch !== bGenreMatch) return bGenreMatch - aGenreMatch;

      const aMoodMatch = a.mood && story.mood && a.mood === story.mood ? 1 : 0;
      const bMoodMatch = b.mood && story.mood && b.mood === story.mood ? 1 : 0;
      if (aMoodMatch !== bMoodMatch) return bMoodMatch - aMoodMatch;

      const aFeatured = a.isFeatured ? 1 : 0;
      const bFeatured = b.isFeatured ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;

      if (a.popularityScore !== b.popularityScore) {
        return b.popularityScore - a.popularityScore;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, 6)
    .map((candidate) => ({
      slug: candidate.slug,
      title: candidate.title,
      cover: candidate.cover,
      accent: candidate.accent,
    }));

  return (
    <StoryPageClient
      story={playerWithTheme}
      isSignedIn={isSignedIn}
      isSubscribed={isSubscribed}
      recommendedStories={recommendedStories}
      spotlightBadge={spotlightBadge}
      spotlightInfoBar={spotlightInfoBar}
    />
  );
}
