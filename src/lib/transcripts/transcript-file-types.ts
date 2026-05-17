import type { TranscriptLineJson } from '@/lib/transcripts/from-script';
import { scriptToTranscriptLines } from '@/lib/transcripts/from-script';
import { srtToTranscriptLines } from '@/lib/transcripts/from-srt';

/** Private R2 object keys accepted for episode transcript import. */
export const TRANSCRIPT_FILE_EXTENSIONS = [
  '.srt',
  '.txt',
  '.text',
  '.md',
] as const;

export function isTranscriptStorageKey(key: string): boolean {
  const lower = key.trim().toLowerCase();
  if (!lower || lower.endsWith('/')) return false;
  return TRANSCRIPT_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function transcriptFileExtensionList(): string {
  return TRANSCRIPT_FILE_EXTENSIONS.map((e) => e.slice(1)).join(', ');
}

/**
 * Parse transcript file body by object key extension (.srt vs plain text / markdown).
 */
export function parseTranscriptFileContent(
  key: string,
  content: string
): TranscriptLineJson[] {
  const lower = key.trim().toLowerCase();
  if (lower.endsWith('.srt')) {
    return srtToTranscriptLines(content);
  }
  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.text') ||
    lower.endsWith('.md')
  ) {
    return scriptToTranscriptLines(content);
  }
  return [];
}
