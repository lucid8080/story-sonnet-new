import { randomUUID } from 'node:crypto';
import { isValidStorySlug, normalizeStorySlug } from '@/lib/slug';

/** Conservative max UTF-8 byte length for S3 object keys (limit is 1024). */
const MAX_OBJECT_KEY_BYTES = 900;

export class UploadKeyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadKeyValidationError';
  }
}

export function sanitizeUploadFileName(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!s || /^_+$/.test(s)) return 'file';
  return s;
}

/**
 * Append a short unique token before the file extension so repeated uploads
 * under the same slug path do not overwrite (e.g. cover.png -> cover-abc123def456.png).
 * Input must already be sanitized.
 */
export function makeUniqueSafeFileName(safeFileName: string): string {
  const token = randomUUID().replace(/-/g, '').slice(0, 12);
  const i = safeFileName.lastIndexOf('.');
  if (i <= 0) {
    const base = safeFileName.length ? safeFileName : 'file';
    return `${base}-${token}`;
  }
  return `${safeFileName.slice(0, i)}-${token}${safeFileName.slice(i)}`;
}

function assertKeyLength(key: string): void {
  if (Buffer.byteLength(key, 'utf8') > MAX_OBJECT_KEY_BYTES) {
    throw new UploadKeyValidationError(
      'Object key is too long; use a shorter filename or slug.'
    );
  }
}

/**
 * Parse optional `audio/music` style path. Each segment must match story slug rules.
 */
export function parseAudioSubPathSegments(
  raw: string | null | undefined
): string[] {
  if (raw == null || String(raw).trim() === '') return [];
  const segments = String(raw)
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    if (!isValidStorySlug(seg)) {
      throw new UploadKeyValidationError(
        `Invalid audio subpath segment "${seg}" (use lowercase letters, numbers, hyphens only).`
      );
    }
  }
  return segments;
}

export function validateStorySlugInput(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') return '';
  const n = normalizeStorySlug(raw);
  if (!isValidStorySlug(n)) {
    throw new UploadKeyValidationError(
      'Invalid story slug (use lowercase letters, numbers, and hyphens).'
    );
  }
  return n;
}

export function buildCoverKey(params: {
  storySlug?: string;
  safeFileName: string;
}): string {
  const leaf = params.safeFileName;
  const slug = params.storySlug?.trim() ? params.storySlug : '';
  const key = slug ? `covers/${slug}/${leaf}` : `covers/${leaf}`;
  assertKeyLength(key);
  return key;
}

/** Public PNG spotlight badges (transparent-friendly), separate from story covers. */
export function buildSpotlightBadgeKey(params: { safeFileName: string }): string {
  const key = `spotlight-badges/${params.safeFileName}`;
  assertKeyLength(key);
  return key;
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isPngBuffer(buf: Buffer): boolean {
  return buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC);
}

export function buildPrivateAudioKey(params: {
  storySlug?: string;
  subPathSegments?: string[];
  safeFileName: string;
}): string {
  const leaf = params.safeFileName;
  const slug = params.storySlug?.trim() ? params.storySlug : '';
  const sub = params.subPathSegments ?? [];

  if (!slug) {
    if (sub.length > 0) {
      throw new UploadKeyValidationError(
        'Audio subfolder requires a story slug; set story slug or clear subfolder.'
      );
    }
    const key = `audio/${leaf}`;
    assertKeyLength(key);
    return key;
  }

  const key = ['audio', slug, ...sub, leaf].join('/');
  assertKeyLength(key);
  return key;
}
