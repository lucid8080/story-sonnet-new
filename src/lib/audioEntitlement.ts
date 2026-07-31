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
  isSubscribed: boolean,
  isLoggedIn: boolean = false,
  requiresSignup: boolean = false
): boolean {
  if (isSubscribed) return true;
  if (episodeIsFreePreview) {
    if (requiresSignup) return isLoggedIn;
    return true;
  }
  return !needsSubscriptionForEpisode(
    storyIsPremium,
    episodeIsPremium,
    episodeIsFreePreview
  );
}

/**
 * True when this viewer cannot play yet (paywall / signup gate).
 * Signup-required free preview: locked only when logged out.
 * Premium non-preview: locked when not subscribed (signup or pricing redirect).
 */
export function episodeRequiresAccount(
  storyIsPremium: boolean,
  episodeIsPremium: boolean,
  episodeIsFreePreview: boolean,
  isSubscribed: boolean,
  isLoggedIn: boolean = false,
  requiresSignup: boolean = false
): boolean {
  return !canPlayEpisode(
    storyIsPremium,
    episodeIsPremium,
    episodeIsFreePreview,
    isSubscribed,
    isLoggedIn,
    requiresSignup
  );
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
