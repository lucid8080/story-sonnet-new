import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createBadgeSchema = z.object({
  name: z.string().min(1).max(200),
  publicUrl: z.string().url(),
  storagePath: z.string().min(1),
  altText: z.string().max(500).optional().default(''),
  mimeType: z.string().optional().default('image/png'),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  fileSizeBytes: z.number().int().positive().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await prisma.badgeAsset.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ ok: true, badgeAssets: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createBadgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const row = await prisma.badgeAsset.create({
    data: {
      name: parsed.data.name,
      publicUrl: parsed.data.publicUrl,
      storagePath: parsed.data.storagePath,
      altText: parsed.data.altText ?? '',
      mimeType: parsed.data.mimeType ?? 'image/png',
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
      fileSizeBytes: parsed.data.fileSizeBytes ?? null,
      uploadedByUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true, badgeAsset: row });
}
