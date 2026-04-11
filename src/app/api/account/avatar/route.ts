import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getDefaultStorageBucket, uploadPublicObject } from '@/lib/s3';

export const runtime = 'nodejs';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const normalized = trimmed
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'avatar';
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const bucket = getDefaultStorageBucket();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!bucket) {
    return NextResponse.json(
      {
        error:
          'Storage bucket missing. Set R2_BUCKET or S3_BUCKET to enable avatar uploads.',
      },
      { status: 400 }
    );
  }

  if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Invalid avatar format. Use JPEG, PNG, or WEBP.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: 'Avatar is too large. Maximum size is 2MB.' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `avatars/${session.user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;

  try {
    const { url } = await uploadPublicObject({
      bucket,
      key,
      body: buffer,
      contentType: file.type,
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: url },
    });

    return NextResponse.json({ imageUrl: url });
  } catch (error) {
    console.error('[account/avatar POST]', error);
    return NextResponse.json(
      { error: 'Avatar upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    });

    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    console.error('[account/avatar DELETE]', error);
    return NextResponse.json(
      { error: 'Could not remove avatar right now.' },
      { status: 500 }
    );
  }
}
