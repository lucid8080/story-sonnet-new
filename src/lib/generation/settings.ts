import type { PrismaClient } from '@prisma/client';

export type GenerationSettingsSnapshot = {
  customStoriesGlobalEnabled: boolean;
};

const GLOBAL_ID = 'global';

let sessionCache: { value: boolean; at: number } | null = null;
const SESSION_CACHE_MS = 30_000;

/** Read-only — safe for auth session hot path (no writes). */
export async function getGenerationSettings(
  prisma: PrismaClient
): Promise<GenerationSettingsSnapshot> {
  const row = await prisma.generationSettings.findUnique({
    where: { id: GLOBAL_ID },
    select: { customStoriesGlobalEnabled: true },
  });
  return {
    customStoriesGlobalEnabled: row?.customStoriesGlobalEnabled ?? false,
  };
}

/** Cached read for auth callbacks (avoids a DB round-trip every request). */
export async function getGenerationSettingsForSession(
  prisma: PrismaClient
): Promise<boolean> {
  const now = Date.now();
  if (sessionCache && now - sessionCache.at < SESSION_CACHE_MS) {
    return sessionCache.value;
  }
  try {
    const { customStoriesGlobalEnabled } = await getGenerationSettings(prisma);
    sessionCache = { value: customStoriesGlobalEnabled, at: now };
    return customStoriesGlobalEnabled;
  } catch {
    return false;
  }
}

/** Ensure row exists (admin settings GET). Avoids upsert — pooler-safe. */
export async function getOrCreateGenerationSettings(
  prisma: PrismaClient
): Promise<GenerationSettingsSnapshot> {
  const existing = await prisma.generationSettings.findUnique({
    where: { id: GLOBAL_ID },
    select: { customStoriesGlobalEnabled: true },
  });
  if (existing) {
    return { customStoriesGlobalEnabled: existing.customStoriesGlobalEnabled };
  }

  try {
    const created = await prisma.generationSettings.create({
      data: { id: GLOBAL_ID },
      select: { customStoriesGlobalEnabled: true },
    });
    sessionCache = null;
    return { customStoriesGlobalEnabled: created.customStoriesGlobalEnabled };
  } catch {
    const row = await prisma.generationSettings.findUnique({
      where: { id: GLOBAL_ID },
      select: { customStoriesGlobalEnabled: true },
    });
    return {
      customStoriesGlobalEnabled: row?.customStoriesGlobalEnabled ?? false,
    };
  }
}

export async function updateGenerationSettings(
  prisma: PrismaClient,
  customStoriesGlobalEnabled: boolean
): Promise<GenerationSettingsSnapshot> {
  await getOrCreateGenerationSettings(prisma);

  const updated = await prisma.generationSettings.update({
    where: { id: GLOBAL_ID },
    data: { customStoriesGlobalEnabled },
    select: { customStoriesGlobalEnabled: true },
  });

  sessionCache = {
    value: updated.customStoriesGlobalEnabled,
    at: Date.now(),
  };

  return { customStoriesGlobalEnabled: updated.customStoriesGlobalEnabled };
}

/** Test helper */
export function clearGenerationSettingsSessionCache(): void {
  sessionCache = null;
}
