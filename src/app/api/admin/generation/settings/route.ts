import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { generationSettingsPatchSchema } from '@/lib/generation/schemas';
import { getOrCreateGenerationSettings } from '@/lib/generation/settings';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const generationSettings = (prisma as typeof prisma & {
    generationSettings?: {
      upsert: (args: unknown) => Promise<{ customStoriesGlobalEnabled?: boolean }>;
    };
  }).generationSettings;

  if (!generationSettings) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Generation settings are unavailable until Prisma client is regenerated.',
      },
      { status: 503 }
    );
  }

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

  const generationSettings = (prisma as typeof prisma & {
    generationSettings?: {
      upsert: (args: unknown) => Promise<{ customStoriesGlobalEnabled?: boolean }>;
    };
  }).generationSettings;
  if (!generationSettings) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Generation settings are unavailable until Prisma client is regenerated.',
      },
      { status: 503 }
    );
  }

  const updated = await generationSettings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      customStoriesGlobalEnabled: parsed.data.customStoriesGlobalEnabled,
    },
    update: {
      customStoriesGlobalEnabled: parsed.data.customStoriesGlobalEnabled,
    },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      customStoriesGlobalEnabled: updated.customStoriesGlobalEnabled,
    },
  });
}
