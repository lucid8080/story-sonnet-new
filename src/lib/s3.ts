import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

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
