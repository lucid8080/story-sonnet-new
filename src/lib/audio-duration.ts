import { parseBuffer } from 'music-metadata';

/**
 * Parses audio duration from an in-memory file buffer.
 * Returns null when metadata is unavailable or parsing fails.
 */
export async function parseAudioDurationSecondsFromBuffer(params: {
  buffer: Buffer;
  mimeType?: string | null;
}): Promise<number | null> {
  try {
    const metadata = await parseBuffer(params.buffer, {
      mimeType: params.mimeType || undefined,
      size: params.buffer.length,
    });
    const seconds = metadata.format.duration;
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
      return null;
    }
    return Math.round(seconds);
  } catch {
    return null;
  }
}

/**
 * Fetches an audio URL and parses duration from response bytes.
 * Returns null when request fails or metadata is unavailable.
 */
export async function parseAudioDurationSecondsFromUrl(
  url: string
): Promise<number | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return parseAudioDurationSecondsFromBuffer({
      buffer: Buffer.from(arrayBuffer),
      mimeType: response.headers.get('content-type'),
    });
  } catch {
    return null;
  }
}
