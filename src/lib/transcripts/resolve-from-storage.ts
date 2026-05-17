import { getPrivateAudioObjectBuffer } from '@/lib/s3';
import type { TranscriptLineJson } from '@/lib/transcripts/from-script';
import {
  isTranscriptStorageKey,
  parseTranscriptFileContent,
  transcriptFileExtensionList,
} from '@/lib/transcripts/transcript-file-types';

export async function transcriptLinesFromPrivateStorageKey(
  key: string
): Promise<TranscriptLineJson[]> {
  const normalized = key.trim().replace(/^\/+/, '');
  if (!normalized) {
    throw new Error('Transcript storage key is required.');
  }
  if (!isTranscriptStorageKey(normalized)) {
    throw new Error(
      `Transcript file must be one of: ${transcriptFileExtensionList()} (object key under audio/).`
    );
  }

  const buffer = await getPrivateAudioObjectBuffer(normalized);
  if (!buffer?.length) {
    throw new Error(
      `Could not load transcript from private storage (key: ${normalized}).`
    );
  }

  const lines = parseTranscriptFileContent(
    normalized,
    buffer.toString('utf8')
  );
  if (!lines.length) {
    throw new Error('Transcript file parsed to zero lines.');
  }
  return lines;
}
