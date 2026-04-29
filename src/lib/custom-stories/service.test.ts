import { describe, expect, it } from 'vitest';
import { deriveSeriesTitleFromSimpleIdea } from '@/lib/custom-stories/service';

describe('deriveSeriesTitleFromSimpleIdea', () => {
  it('builds title from simple idea text', () => {
    expect(
      deriveSeriesTitleFromSimpleIdea('a shy fox who learns to make friends')
    ).toBe('A shy fox who learns to make friends');
  });

  it('falls back to default title for empty input', () => {
    expect(deriveSeriesTitleFromSimpleIdea('   ')).toBe('My Custom Story');
  });
});
