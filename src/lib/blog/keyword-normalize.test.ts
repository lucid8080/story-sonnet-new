import { describe, expect, it } from 'vitest';
import {
  normalizeKeywordPhrase,
  parseKeywordListInput,
} from '@/lib/blog/keyword-normalize';

describe('parseKeywordListInput', () => {
  it('dedupes and parses bullets', () => {
    const raw = `foo bar
• Baz Quux
1. foo bar
foo bar, second`;
    const out = parseKeywordListInput(raw);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(normalizeKeywordPhrase('Hello!!')).toBe('hello');
  });
});
