import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { generationSettingsPatchSchema } from '@/lib/generation/schemas';
import {
  getOrCreateGenerationSettings,
  updateGenerationSettings,
} from '@/lib/generation/settings';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const row = await getOrCreateGenerationSettings(prisma);
  return NextResponse.json({
    ok: true,
    settings: {
      customStoriesGlobalEnabled: row.customStoriesGlobalEnabled,
    },
  });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = generationSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const updated = await updateGenerationSettings(prisma, parsed.data.customStoriesGlobalEnabled);

  return NextResponse.json({
    ok: true,
    settings: {
      customStoriesGlobalEnabled: updated.customStoriesGlobalEnabled,
    },
  });
}
