import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';

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

/** Public origin for object URLs (custom domain or r2.dev subdomain) */
function getPublicBaseUrl(): string | undefined {
  const raw = process.env.R2_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL;
  return raw?.replace(/\/+$/, '');
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

  const endpoint = getS3Endpoint();
  const base =
    getPublicBaseUrl() ||
    (endpoint && params.bucket
      ? `${endpoint.replace(/\/+$/, '')}/${params.bucket}`
      : '');

  if (!base) {
    throw new Error(
      'Set R2_PUBLIC_BASE_URL (or S3_PUBLIC_BASE_URL), or R2_ACCOUNT_ID + bucket so a fallback URL can be built.'
    );
  }

  const url = `${base}/${params.key.replace(/^\/+/, '')}`;
  return { url };
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
