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

/** Logged-out / non-subscriber must create an account (or subscribe) before playback. */
export function episodeRequiresAccount(
  storyIsPremium: boolean,
  episodeIsPremium: boolean,
  episodeIsFreePreview: boolean,
  isSubscribed: boolean
): boolean {
  if (isSubscribed) return false;
  if (episodeIsFreePreview) return false;
  return storyIsPremium || episodeIsPremium;
}

/**
 * Where to send a viewer who hits the playback paywall.
 * Logged-out → signup; logged-in free → pricing (supports story callbackUrl on /pricing).
 */
export function paywallRedirectHref(
  isLoggedIn: boolean,
  returnPath: string
): string {
  if (isLoggedIn) {
    return `/pricing?${new URLSearchParams({ callbackUrl: returnPath }).toString()}`;
  }
  return `/signup?${new URLSearchParams({ callbackUrl: returnPath }).toString()}`;
}
