import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  buildCoverKey,
  buildPrivateAudioKey,
  parseAudioSubPathSegments,
  sanitizeUploadFileName,
  UploadKeyValidationError,
  validateStorySlugInput,
} from '@/lib/media-upload-keys';
import {
  getDefaultStorageBucket,
  getPrivateAudioBucket,
  uploadPrivateAudioObject,
  uploadPublicObject,
} from '@/lib/s3';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const assetKindRaw = (formData.get('assetKind') as string) || 'cover';
  const assetKind =
    assetKindRaw === 'audio' ? 'audio' : ('cover' as 'cover' | 'audio');

  const bucketField =
    (formData.get('bucket') as string) ||
    (assetKind === 'audio'
      ? getPrivateAudioBucket()
      : getDefaultStorageBucket());

  if (!file || !bucketField) {
    return NextResponse.json(
      {
        error:
          assetKind === 'audio'
            ? 'Missing file or private bucket (set R2_PRIVATE_BUCKET or R2_BUCKET, or pass bucket in the form).'
            : 'Missing file or bucket (set R2_BUCKET or S3_BUCKET, or pass bucket in the form).',
      },
      { status: 400 }
    );
  }

  const safeName = sanitizeUploadFileName(file.name);

  let storySlug = '';
  let audioSubPathSegments: string[] = [];

  try {
    storySlug = validateStorySlugInput(formData.get('storySlug') as string);
    if (assetKind === 'audio') {
      audioSubPathSegments = parseAudioSubPathSegments(
        formData.get('audioSubPath') as string
      );
    }
  } catch (e) {
    if (e instanceof UploadKeyValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    if (assetKind === 'audio') {
      const key = buildPrivateAudioKey({
        storySlug: storySlug || undefined,
        subPathSegments: audioSubPathSegments,
        safeFileName: safeName,
      });
      const { key: storageKey } = await uploadPrivateAudioObject({
        bucket: bucketField,
        key,
        body: buf,
        contentType: file.type || 'audio/mpeg',
      });

      if (process.env.DATABASE_URL) {
        await prisma.upload.create({
          data: {
            fileName: file.name,
            fileType: file.type || 'audio/mpeg',
            fileUrl: `r2-private:${storageKey}`,
            storagePath: storageKey,
            uploadedBy: session.user.id,
          },
        });
      }

      return NextResponse.json({
        assetKind: 'audio',
        storageKey,
        fileUrl: null,
        message:
          'Paste storageKey into the episode "Private audio key" field in admin.',
      });
    }

    const key = buildCoverKey({
      storySlug: storySlug || undefined,
      safeFileName: safeName,
    });
    const { url } = await uploadPublicObject({
      bucket: bucketField,
      key,
      body: buf,
      contentType: file.type || 'application/octet-stream',
    });

    if (process.env.DATABASE_URL) {
      await prisma.upload.create({
        data: {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileUrl: url,
          storagePath: key,
          uploadedBy: session.user.id,
        },
      });
    }

    return NextResponse.json({
      assetKind: 'cover',
      fileUrl: url,
      storagePath: key,
    });
  } catch (e) {
    if (e instanceof UploadKeyValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[upload]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
