import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { generationFamilySchema, generationOptionCreateSchema } from '@/lib/generation/schemas';
import { listGroupedGenerationOptionsByFamily } from '@/lib/generation/resolve';
import { serializeGenerationOptionGroup } from '@/lib/generation/serializers';

export const runtime = 'nodejs';

function isValidProviderForFamily(family: string, provider: string): boolean {
  if (family === 'audio_narration') {
    return provider === 'elevenlabs';
  }
  if (family === 'text' || family === 'image') {
    return provider === 'openrouter' || provider === 'openai';
  }
  return false;
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const url = new URL(req.url);
  const familyParsed = generationFamilySchema.safeParse(url.searchParams.get('family'));
  if (!familyParsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid family' }, { status: 400 });
  }

  const groups = await listGroupedGenerationOptionsByFamily(prisma, familyParsed.data);
  return NextResponse.json({
    ok: true,
    family: familyParsed.data,
    groups: groups.map(serializeGenerationOptionGroup),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = generationOptionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  if (!isValidProviderForFamily(parsed.data.family, parsed.data.provider)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Provider "${parsed.data.provider}" is not valid for family "${parsed.data.family}".`,
      },
      { status: 422 }
    );
  }

  const generationOption = (prisma as typeof prisma & {
    generationOption?: { create: (args: unknown) => Promise<unknown> };
  }).generationOption;
  if (!generationOption) {
    return NextResponse.json(
      { ok: false, error: 'Generation options are unavailable until Prisma client is regenerated.' },
      { status: 503 }
    );
  }

  try {
    const created = await generationOption.create({
      data: {
        family: parsed.data.family,
        provider: parsed.data.provider,
        kind: parsed.data.kind,
        vendorLabel: parsed.data.vendorLabel ?? null,
        label: parsed.data.label,
        value: parsed.data.value,
        envKeyRequired: parsed.data.envKeyRequired ?? null,
        isEnabled: parsed.data.isEnabled,
        sortOrder: parsed.data.sortOrder,
      },
    });
    return NextResponse.json({ ok: true, option: created });
  } catch (error) {
    console.error('[admin/generation/options POST]', error);
    return NextResponse.json(
      { ok: false, error: 'Could not create option. Check duplicate family/provider/value.' },
      { status: 409 }
    );
  }
}
