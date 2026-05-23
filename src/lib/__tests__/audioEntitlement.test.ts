import { describe, expect, it } from 'vitest';
import { paywallRedirectHref } from '../audioEntitlement';

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
