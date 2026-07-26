import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  buildPrivateAudioKey,
  makeUniqueSafeFileName,
  parseAudioSubPathSegments,
  sanitizeUploadFileName,
  UploadKeyValidationError,
  validateStorySlugInput,
} from '@/lib/media-upload-keys';
import { getPrivateAudioBucket, presignPrivateAudioPutUrl } from '@/lib/s3';

export const runtime = 'nodejs';

/**
 * Issue a short-lived PUT URL so the browser can upload MP3s directly to the
 * private R2 bucket (avoids Vercel’s 4.5MB function body limit / HTTP 413).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const fileName =
    typeof raw.fileName === 'string' ? raw.fileName.trim() : '';
  if (!fileName) {
    return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
  }

  const contentTypeRaw =
    typeof raw.contentType === 'string' ? raw.contentType.trim() : '';
  const contentType = contentTypeRaw || 'audio/mpeg';
  if (
    contentType !== 'audio/mpeg' &&
    contentType !== 'audio/mp3' &&
    contentType !== 'application/octet-stream'
  ) {
    return NextResponse.json(
      { error: 'contentType must be audio/mpeg (or audio/mp3).' },
      { status: 400 }
    );
  }

  const bucketOverride =
    typeof raw.bucket === 'string' ? raw.bucket.trim() : '';
  if (bucketOverride.includes('/') || bucketOverride.includes('\\')) {
    return NextResponse.json(
      { error: 'bucket must be a bucket name only (no path).' },
      { status: 400 }
    );
  }

  const bucket = bucketOverride || getPrivateAudioBucket();
  if (!bucket) {
    return NextResponse.json(
      {
        error:
          'Missing private audio bucket (set R2_PRIVATE_BUCKET or R2_BUCKET).',
      },
      { status: 400 }
    );
  }

  let safeName = sanitizeUploadFileName(fileName);
  if (!/\.mp3$/i.test(safeName)) {
    return NextResponse.json(
      { error: 'Only .mp3 files can be presigned for private audio upload.' },
      { status: 400 }
    );
  }

  let storySlug = '';
  let audioSubPathSegments: string[] = [];
  try {
    storySlug = validateStorySlugInput(
      typeof raw.storySlug === 'string' ? raw.storySlug : ''
    );
    audioSubPathSegments = parseAudioSubPathSegments(
      typeof raw.audioSubPath === 'string' ? raw.audioSubPath : ''
    );
  } catch (e) {
    if (e instanceof UploadKeyValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  if (storySlug) {
    safeName = makeUniqueSafeFileName(safeName);
  }

  let storageKey: string;
  try {
    storageKey = buildPrivateAudioKey({
      storySlug: storySlug || undefined,
      subPathSegments: audioSubPathSegments,
      safeFileName: safeName,
    });
  } catch (e) {
    if (e instanceof UploadKeyValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  try {
    const signed = await presignPrivateAudioPutUrl({
      key: storageKey,
      contentType,
      bucket,
    });
    return NextResponse.json({
      storageKey: signed.key,
      uploadUrl: signed.uploadUrl,
      contentType: signed.contentType,
      bucket: signed.bucket,
      message:
        'PUT the MP3 bytes to uploadUrl with the Content-Type header, then save storageKey on the episode.',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Presign failed';
    if (
      message.includes('credentials') ||
      message.includes('not configured')
    ) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    console.error('[admin/audio/presign]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
