import { describe, expect, it } from 'vitest';
import {
  scriptToTranscriptLines,
  stripExpressionTags,
} from '@/lib/transcripts/from-script';

describe('stripExpressionTags', () => {
  it('removes bracket expression tags', () => {
    expect(stripExpressionTags('[narrator warmly] Hello there.')).toBe(
      ' Hello there.'
    );
  });

  it('removes multiple tags', () => {
    expect(
      stripExpressionTags('[tag1][tag2] Line [inner] end.')
    ).toMatch(/^\s+Line\s+end\.\s*$/);
  });
});

describe('scriptToTranscriptLines', () => {
  it('produces sequential ids and strips tags per line', () => {
    const lines = scriptToTranscriptLines(
      '[narrator softly]\nFirst line.\n\n[fox]\nSecond line.'
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ id: 1, text: 'First line.' });
    expect(lines[1]).toEqual({ id: 2, text: 'Second line.' });
  });

  it('returns empty array for whitespace-only script', () => {
    expect(scriptToTranscriptLines('   [x]   ')).toEqual([]);
  });
});
