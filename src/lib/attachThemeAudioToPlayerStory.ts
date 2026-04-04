import type { StoryForPlayer } from '@/lib/stories';
import type { ThemeAudioProbeResult } from '@/lib/themeAudioUrls';

export function attachThemeAudioToPlayerStory(
  player: StoryForPlayer,
  probe: ThemeAudioProbeResult
): StoryForPlayer {
  return {
    ...player,
    themeIntroSrc: probe.themeIntroSrc,
    themeFullSrc: probe.themeFullSrc,
    hasIntroTheme: probe.hasIntroTheme,
    hasFullTheme: probe.hasFullTheme,
    themeIntroUseSignedPlayback: probe.themeIntroUseSignedPlayback,
    themeFullUseSignedPlayback: probe.themeFullUseSignedPlayback,
  };
}
