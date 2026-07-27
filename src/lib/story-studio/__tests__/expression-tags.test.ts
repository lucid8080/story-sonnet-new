import { describe, expect, it } from 'vitest';
import {
  ALLOWED_EXPRESSION_TAGS,
  AUDIO_EFFECT_TAGS,
  EMOTIONAL_TONE_TAGS,
  expressionTagsAllowlistForPrompt,
  normalizeExpressionTags,
} from '@/lib/story-studio/expression-tags';

describe('ALLOWED_EXPRESSION_TAGS', () => {
  it('includes all emotional tone and audio effect tags', () => {
    expect(ALLOWED_EXPRESSION_TAGS).toEqual([
      ...EMOTIONAL_TONE_TAGS,
      ...AUDIO_EFFECT_TAGS,
    ]);
    expect(EMOTIONAL_TONE_TAGS).toContain('whispering');
    expect(AUDIO_EFFECT_TAGS).toContain('clear throat');
    expect(AUDIO_EFFECT_TAGS).toContain('long pause');
  });
});

describe('expressionTagsAllowlistForPrompt', () => {
  it('lists canonical bracket forms', () => {
    const text = expressionTagsAllowlistForPrompt();
    expect(text).toContain('[whispering]');
    expect(text).toContain('[laughing]');
    expect(text).toContain('[clear throat]');
    expect(text).not.toContain('[giggles]');
    expect(text).not.toContain('[narrator warmly]');
  });
});

describe('normalizeExpressionTags', () => {
  it('keeps allowlisted tags in canonical lowercase form', () => {
    expect(
      normalizeExpressionTags('[Whispering] Hello. [PAUSE] Then [Excited] go!')
    ).toBe('[whispering] Hello. [pause] Then [excited] go!');
  });

  it('rewrites known aliases', () => {
    expect(
      normalizeExpressionTags(
        '[giggles] Hi. [dramatic pause] [whisper] [clears throat]'
      )
    ).toBe('[laughing] Hi. [pause] [whispering] [clear throat]');
  });

  it('strips unknown brackets', () => {
    expect(
      normalizeExpressionTags(
        '[narrator warmly] Pip smiled. [sleepy yawn] "Hello!"'
      )
    ).toBe('Pip smiled. "Hello!"');
  });

  it('collapses leftover blank lines after stripping', () => {
    expect(normalizeExpressionTags('[yelling from afar]\n\n\nHi')).toBe('Hi');
  });
});
