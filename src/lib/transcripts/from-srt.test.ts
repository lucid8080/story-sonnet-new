import { describe, expect, it } from 'vitest';
import { srtToTranscriptLines } from '@/lib/transcripts/from-srt';

describe('srtToTranscriptLines', () => {
  it('parses standard SRT cues', () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Hello world

2
00:00:02,500 --> 00:00:05,000
Second line`;

    const lines = srtToTranscriptLines(srt);
    expect(lines).toEqual([
      { id: 1, text: 'Hello world' },
      { id: 2, text: 'Second line' },
    ]);
  });

  it('strips HTML and joins multi-line cues', () => {
    const srt = `1
00:00:00,000 --> 00:00:03,000
<i>Part one</i>
Part two`;

    const lines = srtToTranscriptLines(srt);
    expect(lines).toEqual([{ id: 1, text: 'Part one Part two' }]);
  });

  it('returns empty for blank input', () => {
    expect(srtToTranscriptLines('')).toEqual([]);
    expect(srtToTranscriptLines('   ')).toEqual([]);
  });
});
