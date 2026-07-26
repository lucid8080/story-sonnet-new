import { describe, expect, it } from 'vitest';
import {
  stripExpressionBracketTags,
  TAG_DENSITY_UI_OPTIONS,
} from '@/lib/story-studio/tag-density';

describe('TAG_DENSITY_UI_OPTIONS', () => {
  it('includes an Off option first', () => {
    expect(TAG_DENSITY_UI_OPTIONS[0]?.id).toBe('none');
    expect(TAG_DENSITY_UI_OPTIONS.map((o) => o.id)).toEqual([
      'none',
      'light',
      'medium',
      'expressive',
    ]);
  });
});

describe('stripExpressionBracketTags', () => {
  it('removes emotion / performance tags', () => {
    const raw =
      '[narrator warmly] Pip smiled. [giggles] "Hello!" [dramatic pause]\nNext line.';
    expect(stripExpressionBracketTags(raw)).toBe(
      'Pip smiled. "Hello!"\nNext line.'
    );
  });

  it('collapses leftover blank lines', () => {
    expect(stripExpressionBracketTags('[whisper]\n\n\nHi')).toBe('Hi');
  });
});
