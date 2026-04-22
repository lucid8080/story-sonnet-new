import { describe, expect, it } from 'vitest';
import type { SpotlightRailDTO } from '@/lib/content-spotlight/types';
import {
  getNextSlideIndex,
  shouldUseSpotlightSlider,
} from '@/components/spotlight/LibrarySpotlightEventSlider';

function makeRail(id: string): SpotlightRailDTO {
  return {
    spotlightId: id,
    slug: `event-${id}`,
    title: `Event ${id}`,
    shortBlurb: `Blurb ${id}`,
    type: 'awareness_month',
    priority: 1,
    stories: [
      {
        storyId: `story-${id}`,
        slug: `story-${id}`,
        title: `Story ${id}`,
        coverUrl: null,
        sortOrder: 0,
        isFeatured: false,
      },
    ],
  };
}

describe('shouldUseSpotlightSlider', () => {
  it('returns false for zero or one spotlight rail', () => {
    expect(shouldUseSpotlightSlider([])).toBe(false);
    expect(shouldUseSpotlightSlider([makeRail('one')])).toBe(false);
  });

  it('returns true when multiple spotlight rails are present', () => {
    expect(shouldUseSpotlightSlider([makeRail('one'), makeRail('two')])).toBe(
      true
    );
  });
});

describe('getNextSlideIndex', () => {
  it('advances to the next index within range', () => {
    expect(getNextSlideIndex(0, 3)).toBe(1);
    expect(getNextSlideIndex(1, 3)).toBe(2);
  });

  it('wraps to first slide after last slide', () => {
    expect(getNextSlideIndex(2, 3)).toBe(0);
  });

  it('returns zero for empty rail collections', () => {
    expect(getNextSlideIndex(0, 0)).toBe(0);
  });
});
