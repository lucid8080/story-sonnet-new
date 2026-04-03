import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getDefaultStorageBucket, uploadPublicObject } from '@/lib/s3';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const bucketField =
    (formData.get('bucket') as string) || getDefaultStorageBucket();

  if (!file || !bucketField) {
    return NextResponse.json(
      {
        error:
          'Missing file or bucket (set R2_BUCKET or S3_BUCKET, or pass bucket in the form).',
      },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${Date.now()}-${safeName}`;

  try {
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

    return NextResponse.json({ fileUrl: url, storagePath: key });
  } catch (e) {
    console.error('[upload]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
