/**
 * Premium / sample rules for episode playback (mirrored on the server in /api/audio/play).
 */
export function needsSubscriptionForEpisode(
  storyIsPremium: boolean,
  episodeIsPremium: boolean,
  episodeIsFreePreview: boolean
): boolean {
  return (storyIsPremium || episodeIsPremium) && !episodeIsFreePreview;
}

export function canPlayEpisode(
  storyIsPremium: boolean,
  episodeIsPremium: boolean,
  episodeIsFreePreview: boolean,
  isSubscribed: boolean
): boolean {
  return (
    isSubscribed ||
    !needsSubscriptionForEpisode(
      storyIsPremium,
      episodeIsPremium,
      episodeIsFreePreview
    )
  );
}
