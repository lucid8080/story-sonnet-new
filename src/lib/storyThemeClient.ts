import { attachThemeAudioToPlayerStory } from '@/lib/attachThemeAudioToPlayerStory';
import { canPlayEpisode } from '@/lib/audioEntitlement';
import type { StoryForPlayer } from '@/lib/stories';
import type { ThemeAudioProbeResult } from '@/lib/themeAudioUrls';

async function fetchThemePlayUrl(
  slug: string,
  kind: 'intro' | 'full'
): Promise<string | null> {
  const res = await fetch(
    `/api/theme-audio/play?slug=${encodeURIComponent(slug)}&kind=${kind}`,
    { credentials: 'same-origin' }
  );
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { url?: string };
  return data.url?.trim() || null;
}

/** Merge probe metadata and resolve signed theme URLs for entitled viewers (client-only). */
export async function storyWithThemeForViewer(
  story: StoryForPlayer,
  probe: ThemeAudioProbeResult,
  isSubscribed: boolean
): Promise<StoryForPlayer> {
  let merged = attachThemeAudioToPlayerStory(story, probe);
  const firstEp = merged.episodes[0];
  if (!firstEp) return merged;

  const entitled = canPlayEpisode(
    merged.isPremium,
    firstEp.isPremium,
    firstEp.isFreePreview,
    isSubscribed
  );
  if (!entitled) return merged;

  if (
    merged.hasIntroTheme &&
    merged.themeIntroUseSignedPlayback &&
    !merged.themeIntroSrc
  ) {
    const url = await fetchThemePlayUrl(merged.slug, 'intro');
    if (url) {
      merged = {
        ...merged,
        themeIntroSrc: url,
        themeIntroUseSignedPlayback: false,
      };
    }
  }

  if (
    merged.hasFullTheme &&
    merged.themeFullUseSignedPlayback &&
    !merged.themeFullSrc
  ) {
    const url = await fetchThemePlayUrl(merged.slug, 'full');
    if (url) {
      merged = {
        ...merged,
        themeFullSrc: url,
        themeFullUseSignedPlayback: false,
      };
    }
  }

  return merged;
}

/** Intro skip toggle / chrome — visibility only; playback still gated separately. */
export function storyShowsIntroTheme(story: StoryForPlayer): boolean {
  return story.hasIntroTheme;
}

/** Series theme tracklist row — visibility only; playback still gated separately. */
export function storyShowsSeriesTheme(story: StoryForPlayer): boolean {
  return story.hasFullTheme;
}
