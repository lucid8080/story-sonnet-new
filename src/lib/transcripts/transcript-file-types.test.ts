import { describe, expect, it } from 'vitest';
import {
  isTranscriptStorageKey,
  parseTranscriptFileContent,
} from '@/lib/transcripts/transcript-file-types';

describe('isTranscriptStorageKey', () => {
  it('accepts srt and text extensions', () => {
    expect(isTranscriptStorageKey('audio/foo/ep1.srt')).toBe(true);
    expect(isTranscriptStorageKey('audio/foo/script.txt')).toBe(true);
    expect(isTranscriptStorageKey('audio/foo/notes.md')).toBe(true);
    expect(isTranscriptStorageKey('audio/foo/readme.text')).toBe(true);
  });

  it('rejects other extensions', () => {
    expect(isTranscriptStorageKey('audio/foo/ep1.mp3')).toBe(false);
    expect(isTranscriptStorageKey('')).toBe(false);
  });
});

describe('parseTranscriptFileContent', () => {
  it('parses plain text line by line', () => {
    const lines = parseTranscriptFileContent(
      'audio/x/ep1.txt',
      'Line one\n\nLine two'
    );
    expect(lines).toEqual([
      { id: 1, text: 'Line one' },
      { id: 2, text: 'Line two' },
    ]);
  });

  it('parses srt when key ends with .srt', () => {
    const lines = parseTranscriptFileContent(
      'audio/x/ep1.srt',
      `1
00:00:00,000 --> 00:00:02,000
Hello`
    );
    expect(lines).toEqual([{ id: 1, text: 'Hello' }]);
  });
});
