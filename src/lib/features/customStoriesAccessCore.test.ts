import { describe, expect, it } from 'vitest';
import {
  CUSTOM_STORIES_FEATURE_TAG,
  hasCustomStoriesAccess,
  normalizeFeatureTags,
} from '@/lib/features/customStoriesAccessCore';

describe('normalizeFeatureTags', () => {
  it('normalizes case, trims whitespace, and de-duplicates', () => {
    expect(
      normalizeFeatureTags([
        '  Feature:Custom-Stories ',
        'feature:custom-stories',
        'beta',
        10,
      ])
    ).toEqual([CUSTOM_STORIES_FEATURE_TAG, 'beta']);
  });

  it('returns empty array for non-array values', () => {
    expect(normalizeFeatureTags(null)).toEqual([]);
    expect(normalizeFeatureTags({ tags: [] })).toEqual([]);
  });
});

describe('hasCustomStoriesAccess', () => {
  it('allows admins even without feature tags', () => {
    expect(
      hasCustomStoriesAccess({
        role: 'admin',
        internalTags: [],
        customStoriesGlobalEnabled: false,
      })
    ).toBe(true);
  });

  it('allows non-admin users when feature tag exists', () => {
    expect(
      hasCustomStoriesAccess({
        role: 'user',
        internalTags: [CUSTOM_STORIES_FEATURE_TAG],
        customStoriesGlobalEnabled: false,
      })
    ).toBe(true);
  });

  it('allows untagged non-admin users when global toggle is enabled', () => {
    expect(
      hasCustomStoriesAccess({
        role: 'user',
        internalTags: ['other-tag'],
        customStoriesGlobalEnabled: true,
      })
    ).toBe(true);
  });

  it('denies untagged non-admin users when global toggle is disabled', () => {
    expect(
      hasCustomStoriesAccess({
        role: 'user',
        internalTags: ['other-tag'],
        customStoriesGlobalEnabled: false,
      })
    ).toBe(false);
  });
});
