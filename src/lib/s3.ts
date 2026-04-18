import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { normalizeStorySlug } from '@/lib/slug';
import type { Readable } from 'stream';

const DELETE_OBJECTS_BATCH = 1000;

/** R2 S3 API endpoint when only account id is set */
function r2EndpointFromAccount(): string | undefined {
  const id = process.env.R2_ACCOUNT_ID?.trim();
  if (!id) return undefined;
  return `https://${id}.r2.cloudflarestorage.com`;
}

function getS3Endpoint(): string | undefined {
  return (
    process.env.S3_ENDPOINT?.trim() || r2EndpointFromAccount() || undefined
  );
}

function getAccessKeyId(): string | undefined {
  return (
    process.env.R2_ACCESS_KEY_ID?.trim() ||
    process.env.AWS_ACCESS_KEY_ID?.trim()
  );
}

function getSecretAccessKey(): string | undefined {
  return (
    process.env.R2_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_SECRET_ACCESS_KEY?.trim()
  );
}

/**
 * Public origin for object URLs (CDN / custom domain / r2.dev).
 * Order matches {@link resolvePublicAssetUrl} so admin thumbnails and DB covers
 * hit the same host as the rest of the app.
 */
export function getPublicAssetOrigin(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL?.trim() ||
    process.env.R2_PUBLIC_BASE_URL?.trim() ||
    process.env.S3_PUBLIC_BASE_URL?.trim();
  return raw?.replace(/\/+$/, '');
}

const ASSET_KEY_PREFIXES = /^(covers\/|blog\/|spotlight-badges\/|avatars\/)/;

/**
 * Inverse of {@link publicUrlForObjectKey}: extract S3/R2 object key from a public asset URL.
 * Returns null when the URL is not under our asset origin / known R2 path (external hotlink).
 */
export function objectKeyFromPublicAssetUrl(raw: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const bucket =
    process.env.R2_BUCKET?.trim() || process.env.S3_BUCKET?.trim() || '';

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    const k = trimmed.replace(/^\/+/, '');
    return k.length && ASSET_KEY_PREFIXES.test(k) ? k : null;
  }

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  if (u.hostname.endsWith('.r2.cloudflarestorage.com') && bucket) {
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === bucket) {
      const key = parts.slice(1).join('/');
      return key || null;
    }
  }

  const baseRaw = getPublicAssetOrigin();
  if (baseRaw) {
    try {
      const baseUrl = new URL(
        baseRaw.includes('://') ? baseRaw : `https://${baseRaw}`
      );
      if (u.hostname === baseUrl.hostname) {
        const key = u.pathname.replace(/^\/+/, '');
        return key || null;
      }
    } catch {
      /* ignore */
    }
  }

  const pathKey = u.pathname.replace(/^\/+/, '');
  if (pathKey && ASSET_KEY_PREFIXES.test(pathKey)) {
    return pathKey;
  }

  return null;
}

function getClient() {
  const region =
    process.env.S3_REGION || process.env.AWS_REGION || 'auto';
  const endpoint = getS3Endpoint();
  const accessKeyId = getAccessKeyId();
  const secretAccessKey = getSecretAccessKey();

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: !!endpoint,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
  });
}

export function getDefaultStorageBucket(): string | undefined {
  return (
    process.env.R2_BUCKET?.trim() || process.env.S3_BUCKET?.trim() || undefined
  );
}

/** Private bucket for paywalled MP3s (no public read). Falls back to R2_BUCKET if unset. */
export function getPrivateAudioBucket(): string | undefined {
  const p = process.env.R2_PRIVATE_BUCKET?.trim();
  if (p) return p;
  return getDefaultStorageBucket();
}

/**
 * Public HTTP URL for an object key in the public assets bucket.
 * Same base resolution as {@link uploadPublicObject} return value.
 */
export function publicUrlForObjectKey(
  key: string,
  bucket?: string
): string {
  const normalizedKey = key.replace(/^\/+/, '');
  const b = (bucket?.trim() || getDefaultStorageBucket() || '').trim();
  const endpoint = getS3Endpoint();
  const base =
    getPublicAssetOrigin() ||
    (endpoint && b ? `${endpoint.replace(/\/+$/, '')}/${b}` : '');

  if (!base) {
    throw new Error(
      'Set NEXT_PUBLIC_ASSETS_BASE_URL or R2_PUBLIC_BASE_URL (or S3_PUBLIC_BASE_URL), or R2_ACCOUNT_ID + bucket so a fallback URL can be built.'
    );
  }

  return `${base.replace(/\/+$/, '')}/${normalizedKey}`;
}

export async function uploadPublicObject(params: {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ url: string }> {
  const client = getClient();
  const input: PutObjectCommandInput = {
    Bucket: params.bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  };
  await client.send(new PutObjectCommand(input));

  return { url: publicUrlForObjectKey(params.key, params.bucket) };
}

/** One ListObjectsV2 page (used by admin cover browser). */
export async function listObjectsV2SinglePage(params: {
  bucket: string;
  prefix: string;
  maxKeys: number;
  continuationToken?: string;
}): Promise<{
  contents: { key: string; size?: number }[];
  nextContinuationToken?: string;
}> {
  const accessKeyId = getAccessKeyId();
  const secretAccessKey = getSecretAccessKey();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3/R2 credentials are not configured; cannot list objects.'
    );
  }
  const client = getClient();
  const out = await client.send(
    new ListObjectsV2Command({
      Bucket: params.bucket,
      Prefix: params.prefix,
      MaxKeys: Math.min(Math.max(1, params.maxKeys), 1000),
      ContinuationToken: params.continuationToken,
    })
  );
  const contents: { key: string; size?: number }[] =
    out.Contents?.flatMap((c) =>
      c.Key ? [{ key: c.Key, size: c.Size }] : []
    ) ?? [];
  return {
    contents,
    nextContinuationToken: out.IsTruncated
      ? out.NextContinuationToken
      : undefined,
  };
}

/** Upload to private audio bucket; returns object key only (no public URL). */
export async function uploadPrivateAudioObject(params: {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ key: string }> {
  const client = getClient();
  const input: PutObjectCommandInput = {
    Bucket: params.bucket,
    Key: params.key.replace(/^\/+/, ''),
    Body: params.body,
    ContentType: params.contentType,
  };
  await client.send(new PutObjectCommand(input));
  return { key: input.Key as string };
}

const AUDIO_SIGN_DEFAULT_TTL_SEC = 900;

/** Returns whether an object exists in the private audio bucket (for theme probe, etc.). */
export async function headPrivateAudioObjectExists(
  key: string
): Promise<boolean> {
  const bucket = getPrivateAudioBucket();
  if (!bucket) return false;
  const accessKeyId = getAccessKeyId();
  const secretAccessKey = getSecretAccessKey();
  if (!accessKeyId || !secretAccessKey) return false;
  const normalized = key.replace(/^\/+/, '');
  try {
    const client = getClient();
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: normalized,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function presignPrivateAudioGetUrl(params: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const bucket = getPrivateAudioBucket();
  if (!bucket) {
    throw new Error('Set R2_PRIVATE_BUCKET or R2_BUCKET for private audio.');
  }
  const client = getClient();
  const key = params.key.replace(/^\/+/, '');
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: 'audio/mpeg',
  });
  return getSignedUrl(client, cmd, {
    expiresIn: params.expiresIn ?? AUDIO_SIGN_DEFAULT_TTL_SEC,
  });
}

async function bodyToBuffer(
  body:
    | Readable
    | Blob
    | ReadableStream
    | { transformToByteArray?: () => Promise<Uint8Array> }
): Promise<Buffer> {
  if (
    typeof body === 'object' &&
    body != null &&
    'transformToByteArray' in body &&
    typeof body.transformToByteArray === 'function'
  ) {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }

  const chunks: Buffer[] = [];
  const stream = body as Readable;
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Downloads a private audio object as a Buffer. Returns null when unavailable.
 */
export async function getPrivateAudioObjectBuffer(
  key: string
): Promise<Buffer | null> {
  const bucket = getPrivateAudioBucket();
  if (!bucket) return null;
  const accessKeyId = getAccessKeyId();
  const secretAccessKey = getSecretAccessKey();
  if (!accessKeyId || !secretAccessKey) return null;

  const normalized = key.replace(/^\/+/, '');
  if (!normalized) return null;

  try {
    const client = getClient();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: normalized,
      })
    );
    if (!response.Body) return null;
    return await bodyToBuffer(response.Body);
  } catch {
    return null;
  }
}

/**
 * Downloads a public bucket object by key (same bucket as {@link uploadPublicObject}).
 */
export async function getPublicObjectBuffer(
  key: string,
  bucket?: string
): Promise<Buffer | null> {
  const b = (bucket?.trim() || getDefaultStorageBucket() || '').trim();
  if (!b) return null;
  const accessKeyId = getAccessKeyId();
  const secretAccessKey = getSecretAccessKey();
  if (!accessKeyId || !secretAccessKey) return null;

  const normalized = key.replace(/^\/+/, '');
  if (!normalized) return null;

  try {
    const client = getClient();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: b,
        Key: normalized,
      })
    );
    if (!response.Body) return null;
    return await bodyToBuffer(response.Body);
  } catch {
    return null;
  }
}

/**
 * Deletes all objects whose keys start with `prefix` (e.g. `covers/my-slug/`).
 * Returns number of objects removed. No-op when bucket or prefix is missing.
 */
export async function deleteObjectsWithPrefix(
  bucket: string | undefined,
  prefix: string
): Promise<number> {
  const p = prefix.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!bucket?.trim() || !p) return 0;

  const accessKeyId = getAccessKeyId();
  const secretAccessKey = getSecretAccessKey();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3/R2 credentials are not configured; cannot delete stored files.'
    );
  }

  const listPrefix = `${p}/`;
  const client = getClient();
  let total = 0;
  let continuationToken: string | undefined;

  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: listPrefix,
        ContinuationToken: continuationToken,
      })
    );
    const keys =
      list.Contents?.map((c) => c.Key).filter((k): k is string => !!k) ?? [];
    continuationToken = list.IsTruncated
      ? list.NextContinuationToken
      : undefined;

    for (let i = 0; i < keys.length; i += DELETE_OBJECTS_BATCH) {
      const chunk = keys.slice(i, i + DELETE_OBJECTS_BATCH);
      const delOut = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      );
      if (delOut.Errors?.length) {
        const msg = delOut.Errors.map((e) => e.Message).join('; ');
        throw new Error(msg || 'S3 DeleteObjects failed');
      }
      total += chunk.length;
    }
  } while (continuationToken);

  return total;
}

/**
 * Removes published story assets under `covers/<slug>/` and `audio/<slug>/`
 * (public bucket and private audio bucket). Does not touch Story Studio draft paths
 * (`covers/studio-draft-…`).
 */
export async function deleteStorageForStorySlug(rawSlug: string): Promise<void> {
  const slug = normalizeStorySlug(rawSlug);
  if (!slug) {
    console.warn('[deleteStorageForStorySlug] empty slug, skipping storage');
    return;
  }

  const publicBucket = getDefaultStorageBucket();
  const privateBucket = getPrivateAudioBucket();

  try {
    const nCover = await deleteObjectsWithPrefix(
      publicBucket,
      `covers/${slug}`
    );
    const nAudio = await deleteObjectsWithPrefix(
      privateBucket,
      `audio/${slug}`
    );
    if (nCover + nAudio > 0) {
      console.info(
        `[deleteStorageForStorySlug] slug=${slug} removed objects: covers=${nCover} audio=${nAudio}`
      );
    }
  } catch (e) {
    console.error('[deleteStorageForStorySlug]', e);
    throw e;
  }
}
