import type { PrismaClient } from '@prisma/client';
import {
  ART_STYLE_OPTIONS,
  type ArtStyleId,
  type ArtStylePromptOverrides,
} from '@/lib/story-studio/art-style-options';

const MAX_PROMPT_LEN = 3000;

function isMissingStoryStudioSettingsTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; meta?: { table?: string } };
  return (
    e.code === 'P2021' &&
    typeof e.meta?.table === 'string' &&
    e.meta.table.includes('story_studio_settings')
  );
}

function isArtStyleId(k: string): k is ArtStyleId {
  return ART_STYLE_OPTIONS.some((o) => o.id === k);
}

/** Parse JSON from DB into a safe override map (unknown keys dropped). */
export function parseArtStylePromptOverrides(raw: unknown): ArtStylePromptOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: ArtStylePromptOverrides = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isArtStyleId(k)) continue;
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t) continue;
    out[k] = t.slice(0, MAX_PROMPT_LEN);
  }
  return out;
}

export async function getOrCreateStoryStudioSettings(prisma: PrismaClient) {
  let row: Awaited<ReturnType<PrismaClient['storyStudioSettings']['findUnique']>>;
  try {
    row = await prisma.storyStudioSettings.findUnique({
      where: { id: 'global' },
    });
  } catch (error) {
    throw error;
  }
  if (!row) {
    row = await prisma.storyStudioSettings.create({
      data: {
        id: 'global',
        artStylePromptOverridesJson: {},
      },
    });
  }
  return row;
}

export async function getArtStylePromptOverrides(
  prisma: PrismaClient
): Promise<ArtStylePromptOverrides> {
  try {
    const row = await getOrCreateStoryStudioSettings(prisma);
    return parseArtStylePromptOverrides(row.artStylePromptOverridesJson);
  } catch (error) {
    if (isMissingStoryStudioSettingsTableError(error)) {
      return {};
    }
    throw error;
  }
}
