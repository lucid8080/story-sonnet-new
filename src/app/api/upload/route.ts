import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  buildBlogImageKey,
  buildCoverKey,
  buildPrivateAudioKey,
  buildSpotlightBadgeKey,
  isPngBuffer,
  makeUniqueSafeFileName,
  parseAudioSubPathSegments,
  sanitizeUploadFileName,
  UploadKeyValidationError,
  validateStorySlugInput,
} from '@/lib/media-upload-keys';
import {
  getDefaultStorageBucket,
  getPrivateAudioBucket,
  uploadPrivateAudioObject,
} from '@/lib/s3';
import { parseAudioDurationSecondsFromBuffer } from '@/lib/audio-duration';
import { uploadOriginalPlusDisplayWebp } from '@/lib/images/dualPublicImageUpload';

export const runtime = 'nodejs';

const SPOTLIGHT_BADGE_MAX_BYTES = 1_000_000;

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const assetKindRaw = (formData.get('assetKind') as string) || 'cover';
  const assetKind:
    | 'cover'
    | 'audio'
    | 'spotlight_badge'
    | 'blog_cover'
    | 'blog_inline' =
    assetKindRaw === 'audio'
      ? 'audio'
      : assetKindRaw === 'spotlight_badge'
        ? 'spotlight_badge'
        : assetKindRaw === 'blog_cover'
          ? 'blog_cover'
          : assetKindRaw === 'blog_inline'
            ? 'blog_inline'
            : 'cover';

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

  let safeName = sanitizeUploadFileName(file.name);

  let storySlug = '';
  let blogSlug = '';
  let audioSubPathSegments: string[] = [];

  try {
    storySlug = validateStorySlugInput(formData.get('storySlug') as string);
    blogSlug = validateStorySlugInput(formData.get('blogSlug') as string);
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

  if (
    storySlug ||
    assetKind === 'spotlight_badge' ||
    ((assetKind === 'blog_cover' || assetKind === 'blog_inline') && blogSlug)
  ) {
    safeName = makeUniqueSafeFileName(safeName);
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    if (assetKind === 'spotlight_badge') {
      if (buf.length > SPOTLIGHT_BADGE_MAX_BYTES) {
        return NextResponse.json(
          {
            error: `PNG badge must be at most ${SPOTLIGHT_BADGE_MAX_BYTES} bytes`,
          },
          { status: 400 }
        );
      }
      if (!isPngBuffer(buf)) {
        return NextResponse.json(
          { error: 'Spotlight badge must be a valid PNG file' },
          { status: 400 }
        );
      }
      const lower = safeName.toLowerCase();
      if (!lower.endsWith('.png')) {
        safeName = `${safeName.replace(/\.[^.]+$/, '')}.png`;
      }
      const key = buildSpotlightBadgeKey({ safeFileName: safeName });
      const dual = await uploadOriginalPlusDisplayWebp({
        bucket: bucketField,
        originalKey: key,
        body: buf,
        originalContentType: 'image/png',
        preset: 'spotlight_badge',
      });

      if (process.env.DATABASE_URL) {
        await prisma.upload.create({
          data: {
            fileName: file.name,
            fileType: 'image/png',
            fileUrl: dual.originalUrl,
            storagePath: dual.originalKey,
            uploadedBy: session.user.id,
          },
        });
        if (dual.displayKey !== dual.originalKey) {
          await prisma.upload.create({
            data: {
              fileName: `${file.name} (display.webp)`,
              fileType: 'image/webp',
              fileUrl: dual.displayUrl,
              storagePath: dual.displayKey,
              uploadedBy: session.user.id,
            },
          });
        }
      }

      return NextResponse.json({
        assetKind: 'spotlight_badge',
        fileUrl: dual.displayUrl,
        storagePath: dual.displayKey,
        originalFileUrl: dual.originalUrl,
        originalStoragePath: dual.originalKey,
      });
    }

    if (assetKind === 'blog_cover' || assetKind === 'blog_inline') {
      if (!blogSlug) {
        return NextResponse.json(
          {
            error:
              'Blog uploads require blogSlug (lowercase slug for the post path segment).',
          },
          { status: 400 }
        );
      }
      const key = buildBlogImageKey({ blogSlug, safeFileName: safeName });
      const ct = file.type || 'image/jpeg';
      const dual = await uploadOriginalPlusDisplayWebp({
        bucket: bucketField,
        originalKey: key,
        body: buf,
        originalContentType: ct,
        preset: 'blog',
      });

      if (process.env.DATABASE_URL) {
        await prisma.upload.create({
          data: {
            fileName: file.name,
            fileType: ct,
            fileUrl: dual.originalUrl,
            storagePath: dual.originalKey,
            uploadedBy: session.user.id,
          },
        });
        if (dual.displayKey !== dual.originalKey) {
          await prisma.upload.create({
            data: {
              fileName: `${file.name} (display.webp)`,
              fileType: 'image/webp',
              fileUrl: dual.displayUrl,
              storagePath: dual.displayKey,
              uploadedBy: session.user.id,
            },
          });
        }
      }

      return NextResponse.json({
        assetKind,
        fileUrl: dual.displayUrl,
        storagePath: dual.displayKey,
        originalFileUrl: dual.originalUrl,
        originalStoragePath: dual.originalKey,
      });
    }

    if (assetKind === 'audio') {
      const durationSeconds = await parseAudioDurationSecondsFromBuffer({
        buffer: buf,
        mimeType: file.type || 'audio/mpeg',
      });
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
        durationSeconds,
        fileUrl: null,
        message:
          'Paste storageKey into the episode "Private audio key" field in admin. Duration is auto-derived from MP3 metadata when available.',
      });
    }

    const key = buildCoverKey({
      storySlug: storySlug || undefined,
      safeFileName: safeName,
    });
    const ct = file.type || 'application/octet-stream';
    const dual = await uploadOriginalPlusDisplayWebp({
      bucket: bucketField,
      originalKey: key,
      body: buf,
      originalContentType: ct,
      preset: 'cover',
    });

    if (process.env.DATABASE_URL) {
      await prisma.upload.create({
        data: {
          fileName: file.name,
          fileType: ct,
          fileUrl: dual.originalUrl,
          storagePath: dual.originalKey,
          uploadedBy: session.user.id,
        },
      });
      if (dual.displayKey !== dual.originalKey) {
        await prisma.upload.create({
          data: {
            fileName: `${file.name} (display.webp)`,
            fileType: 'image/webp',
            fileUrl: dual.displayUrl,
            storagePath: dual.displayKey,
            uploadedBy: session.user.id,
          },
        });
      }
    }

    return NextResponse.json({
      assetKind: 'cover',
      fileUrl: dual.displayUrl,
      storagePath: dual.displayKey,
      originalFileUrl: dual.originalUrl,
      originalStoragePath: dual.originalKey,
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
