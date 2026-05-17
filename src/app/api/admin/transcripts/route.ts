import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getPrivateAudioBucket,
  listObjectsV2SinglePage,
} from '@/lib/s3';
import { isTranscriptStorageKey } from '@/lib/transcripts/transcript-file-types';

export const runtime = 'nodejs';

function assertSafeAudioPrefix(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/^\/+/, '');
  const collapsed = trimmed.replace(/\/+/g, '/');
  if (collapsed.includes('..')) {
    throw new Error('Invalid prefix');
  }
  if (collapsed === '' || collapsed === 'audio') {
    return 'audio/';
  }
  if (!collapsed.startsWith('audio/')) {
    throw new Error('Prefix must start with audio/');
  }
  return collapsed.endsWith('/') ? collapsed : `${collapsed}/`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bucket = getPrivateAudioBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: 'Missing private audio bucket (set R2_PRIVATE_BUCKET or R2_BUCKET).' },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  let prefix: string;
  try {
    prefix = assertSafeAudioPrefix(url.searchParams.get('prefix'));
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
    const { contents, nextContinuationToken } = await listObjectsV2SinglePage({
      bucket,
      prefix,
      maxKeys,
      continuationToken,
    });

    const items = contents
      .filter((c) => isTranscriptStorageKey(c.key))
      .map((c) => ({ key: c.key }));

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
    console.error('[admin/transcripts]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
