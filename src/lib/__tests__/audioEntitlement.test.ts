import { describe, expect, it } from 'vitest';
import {
  canPlayEpisode,
  episodeRequiresAccount,
  paywallRedirectHref,
} from '../audioEntitlement';

describe('paywallRedirectHref', () => {
  const storyPath = '/story/the-lighthouse';

  it('sends logged-out users to signup with story callback', () => {
    const href = paywallRedirectHref(false, storyPath);
    expect(href.startsWith('/signup?')).toBe(true);
    const q = new URLSearchParams(href.slice('/signup?'.length));
    expect(q.get('callbackUrl')).toBe(storyPath);
  });

  it('sends logged-in users to pricing with story callback', () => {
    const href = paywallRedirectHref(true, storyPath);
    expect(href.startsWith('/pricing?')).toBe(true);
    const q = new URLSearchParams(href.slice('/pricing?'.length));
    expect(q.get('callbackUrl')).toBe(storyPath);
  });
});

describe('canPlayEpisode / episodeRequiresAccount', () => {
  it('open free preview: logged-out can play', () => {
    expect(
      canPlayEpisode(true, false, true, false, false, false)
    ).toBe(true);
    expect(
      episodeRequiresAccount(true, false, true, false, false, false)
    ).toBe(false);
  });

  it('signup free preview: logged-out blocked; logged-in free can play', () => {
    expect(
      canPlayEpisode(true, false, true, false, false, true)
    ).toBe(false);
    expect(
      episodeRequiresAccount(true, false, true, false, false, true)
    ).toBe(true);

    expect(
      canPlayEpisode(true, false, true, false, true, true)
    ).toBe(true);
    expect(
      episodeRequiresAccount(true, false, true, false, true, true)
    ).toBe(false);
  });

  it('signup free preview: subscribed can play', () => {
    expect(
      canPlayEpisode(true, false, true, true, true, true)
    ).toBe(true);
    expect(
      canPlayEpisode(true, false, true, true, false, true)
    ).toBe(true);
  });

  it('premium non-preview: logged-in free still locked (pricing redirect)', () => {
    expect(
      canPlayEpisode(true, false, false, false, true, false)
    ).toBe(false);
    expect(
      episodeRequiresAccount(true, false, false, false, true, false)
    ).toBe(true);
    const href = paywallRedirectHref(true, '/story/x');
    expect(href.startsWith('/pricing?')).toBe(true);
  });

  it('fully free story: anyone can play', () => {
    expect(
      canPlayEpisode(false, false, false, false, false, false)
    ).toBe(true);
  });
});
