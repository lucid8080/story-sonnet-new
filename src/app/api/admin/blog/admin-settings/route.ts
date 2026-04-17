import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { parseFeatureImageCustomPresets } from '@/lib/blog/blog-admin-settings';
import { blogAdminSettingsPatchSchema } from '@/lib/validation/blogSchemas';

export const runtime = 'nodejs';

async function getOrCreateBlogAdminSettings() {
  let row = await prisma.blogAdminSettings.findUnique({
    where: { id: 'global' },
  });
  if (!row) {
    row = await prisma.blogAdminSettings.create({
      data: {
        id: 'global',
        featureImageStyleCustomPresetsJson: [],
      },
    });
  }
  return row;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const row = await getOrCreateBlogAdminSettings();
    const featureImageStyleCustomPresets = parseFeatureImageCustomPresets(
      row.featureImageStyleCustomPresetsJson
    );
    return NextResponse.json({
      ok: true,
      featureImageStyleCustomPresets,
    });
  } catch (e) {
    console.error('[admin/blog/admin-settings GET]', e);
    return NextResponse.json(
      { ok: false, error: 'Load failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = blogAdminSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  const list = parsed.data.featureImageStyleCustomPresets;

  try {
    const row = await prisma.blogAdminSettings.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        featureImageStyleCustomPresetsJson: list,
      },
      update: {
        featureImageStyleCustomPresetsJson: list,
      },
    });
    const featureImageStyleCustomPresets = parseFeatureImageCustomPresets(
      row.featureImageStyleCustomPresetsJson
    );
    return NextResponse.json({
      ok: true,
      featureImageStyleCustomPresets,
    });
  } catch (e) {
    console.error('[admin/blog/admin-settings PATCH]', e);
    return NextResponse.json(
      { ok: false, error: 'Save failed' },
      { status: 500 }
    );
  }
}
