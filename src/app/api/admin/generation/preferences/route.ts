import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { generationPreferenceUpsertSchema } from '@/lib/generation/schemas';
import { GENERATION_TOOL_FAMILY } from '@/lib/generation/catalog';
import {
  resolveSelectionForTool,
  validateSelectionForTool,
} from '@/lib/generation/resolve';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const generationPref = (prisma as typeof prisma & {
    generationToolPreference?: { findMany: (args: unknown) => Promise<unknown[]> };
  }).generationToolPreference;
  const rows = generationPref
    ? await generationPref.findMany({ orderBy: { toolKey: 'asc' } })
    : [];
  return NextResponse.json({
    ok: true,
    preferences: rows,
    tools: GENERATION_TOOL_FAMILY,
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

  const parsed = generationPreferenceUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const valid = await validateSelectionForTool(
    prisma,
    parsed.data.toolKey,
    parsed.data.selectedCompositeKey
  );
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: 'Selection is not available for that tool/family.' },
      { status: 422 }
    );
  }

  const generationPref = (prisma as typeof prisma & {
    generationToolPreference?: {
      upsert: (args: unknown) => Promise<unknown>;
    };
  }).generationToolPreference;
  if (!generationPref) {
    return NextResponse.json(
      { ok: false, error: 'Generation preferences are unavailable until Prisma client is regenerated.' },
      { status: 503 }
    );
  }

  const updated = await generationPref.upsert({
    where: { toolKey: parsed.data.toolKey },
    create: {
      toolKey: parsed.data.toolKey,
      family: GENERATION_TOOL_FAMILY[parsed.data.toolKey],
      selectedCompositeKey: parsed.data.selectedCompositeKey,
    },
    update: {
      family: GENERATION_TOOL_FAMILY[parsed.data.toolKey],
      selectedCompositeKey: parsed.data.selectedCompositeKey,
    },
  });

  const resolved = await resolveSelectionForTool(prisma, parsed.data.toolKey);
  return NextResponse.json({ ok: true, preference: updated, resolved });
}
