import { describe, expect, it } from 'vitest';
import { mergeScriptPackageWithEpisodes } from '@/lib/story-studio/merge-script-package';

const basePackage = {
  seriesTitle: 'Test series',
  summary: 'Series summary for listeners.',
  coverArtPrompt: '',
  musicPrompt: '',
  narrationNotes: '',
  estimatedRuntimeMinutes: 3,
  ageRange: '6-8' as const,
  tags: [] as string[],
  expressionTagDensity: 'medium' as const,
  episodes: [
    {
      title: 'Episode 1',
      summary: 'First episode teaser.',
      scriptText: 'Narrator lines from the package.',
    },
  ],
};

describe('mergeScriptPackageWithEpisodes', () => {
  it('reuses stored script when the draft row script is empty', () => {
    const result = mergeScriptPackageWithEpisodes(basePackage, [
      {
        title: 'Episode 1',
        scriptText: '',
        summary: 'First episode teaser.',
      },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.episodes[0].scriptText).toBe(
        'Narrator lines from the package.'
      );
    }
  });

  it('returns a per-episode message when script text is missing everywhere', () => {
    const result = mergeScriptPackageWithEpisodes(
      {
        ...basePackage,
        episodes: [{ title: 'Empty ep', summary: 'Teaser.', scriptText: '' }],
      },
      [{ title: 'Empty ep', scriptText: '', summary: null }]
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Episode 1/);
      expect(result.message).toMatch(/script text/i);
    }
  });
});
