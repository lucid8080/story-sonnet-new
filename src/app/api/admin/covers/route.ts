import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getDefaultStorageBucket,
  listObjectsV2SinglePage,
  publicUrlForObjectKey,
} from '@/lib/s3';

export const runtime = 'nodejs';

const IMAGE_KEY = /\.(png|jpe?g|webp|gif|avif)$/i;

function assertSafeCoversPrefix(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/^\/+/, '');
  const collapsed = trimmed.replace(/\/+/g, '/');
  if (collapsed.includes('..')) {
    throw new Error('Invalid prefix');
  }
  if (collapsed === '' || collapsed === 'covers') {
    return 'covers/';
  }
  if (!collapsed.startsWith('covers/')) {
    throw new Error('Prefix must start with covers/');
  }
  return collapsed;
}

function isCoverImageKey(key: string): boolean {
  if (!key || key.endsWith('/')) return false;
  return IMAGE_KEY.test(key);
}

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bucket = getDefaultStorageBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: 'Missing public bucket (set R2_BUCKET or S3_BUCKET).' },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  let prefix: string;
  try {
    prefix = assertSafeCoversPrefix(url.searchParams.get('prefix'));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid prefix' },
      { status: 400 }
    );
  }

  const maxRaw = Number(url.searchParams.get('maxKeys') ?? '300');
  const maxKeys = Number.isFinite(maxRaw)
    ? Math.min(500, Math.max(1, Math.floor(maxRaw)))
    : 300;
  const continuationToken =
    url.searchParams.get('continuationToken')?.trim() || undefined;

  try {
    const { contents, nextContinuationToken } =
      await listObjectsV2SinglePage({
        bucket,
        prefix,
        maxKeys,
        continuationToken,
      });

    const items = contents
      .filter((c) => isCoverImageKey(c.key))
      .map((c) => ({
        key: c.key,
        url: publicUrlForObjectKey(c.key, bucket),
      }));

    return NextResponse.json({
      items,
      nextContinuationToken,
      prefix,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'List failed';
    if (
      message.includes('credentials') ||
      message.includes('not configured')
    ) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    console.error('[admin/covers]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
