import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
  ART_STYLE_OPTIONS,
  type ArtStyleId,
} from '@/lib/story-studio/art-style-options';
import {
  getOrCreateStoryStudioSettings,
  parseArtStylePromptOverrides,
} from '@/lib/story-studio/story-studio-settings';

export const runtime = 'nodejs';

const MAX_PROMPT_LEN = 3000;

const patchBodySchema = z
  .object({
    artStylePromptOverrides: z.record(z.string(), z.string()).optional(),
  })
  .strict();

function normalizeOverridesInput(
  raw: Record<string, string> | undefined
): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const valid = new Set(ART_STYLE_OPTIONS.map((o) => o.id));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!valid.has(k as ArtStyleId)) continue;
    const t = typeof v === 'string' ? v.trim() : '';
    if (!t) continue;
    out[k] = t.slice(0, MAX_PROMPT_LEN);
  }
  return out;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const row = await getOrCreateStoryStudioSettings(prisma);
    const overrides = parseArtStylePromptOverrides(
      row.artStylePromptOverridesJson
    );
    return NextResponse.json({
      ok: true,
      artStylePromptOverrides: overrides,
    });
  } catch (e) {
    console.error('[admin/story-studio/settings GET]', e);
    return NextResponse.json(
      { ok: false, error: 'Load failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
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

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalized = normalizeOverridesInput(
    parsed.data.artStylePromptOverrides
  );

  try {
    const row = await prisma.storyStudioSettings.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        artStylePromptOverridesJson: normalized,
      },
      update: {
        artStylePromptOverridesJson: normalized,
      },
    });
    return NextResponse.json({
      ok: true,
      artStylePromptOverrides: parseArtStylePromptOverrides(
        row.artStylePromptOverridesJson
      ),
    });
  } catch (e) {
    console.error('[admin/story-studio/settings PATCH]', e);
    return NextResponse.json(
      { ok: false, error: 'Save failed' },
      { status: 500 }
    );
  }
}
