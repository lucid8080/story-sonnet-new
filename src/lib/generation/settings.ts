import type { PrismaClient } from '@prisma/client';

type GenerationSettingsRow = { customStoriesGlobalEnabled?: boolean };

type PrismaWithGenerationSettings = PrismaClient & {
  generationSettings?: {
    upsert: (args: unknown) => Promise<GenerationSettingsRow>;
  };
  $queryRawUnsafe?: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
  $executeRawUnsafe?: (query: string, ...values: unknown[]) => Promise<number>;
};

async function ensureGenerationSettingsTable(prisma: PrismaWithGenerationSettings) {
  await prisma.$executeRawUnsafe?.(
    'CREATE TABLE IF NOT EXISTS generation_settings (id TEXT PRIMARY KEY, custom_stories_global_enabled BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())'
  );
}

export async function getOrCreateGenerationSettings(prisma: PrismaClient) {
  const prismaAny = prisma as PrismaWithGenerationSettings;
  const generationSettings = prismaAny.generationSettings;
  if (!generationSettings) {
    try {
      await ensureGenerationSettingsTable(prismaAny);
      const rows = await prismaAny.$queryRawUnsafe?.<
        { custom_stories_global_enabled: boolean }[]
      >(
        'SELECT custom_stories_global_enabled FROM generation_settings WHERE id = $1 LIMIT 1',
        'global'
      );
      const row = rows?.[0];
      if (row) {
        return { customStoriesGlobalEnabled: Boolean(row.custom_stories_global_enabled) };
      }
      await prismaAny.$executeRawUnsafe?.(
        'INSERT INTO generation_settings (id, custom_stories_global_enabled, updated_at) VALUES ($1, $2, NOW())',
        'global',
        false
      );
      return { customStoriesGlobalEnabled: false };
    } catch {
      return { customStoriesGlobalEnabled: false };
    }
  }
  return generationSettings.upsert({
    where: { id: 'global' },
    create: { id: 'global' },
    update: {},
  });
}

export async function updateGenerationSettings(
  prisma: PrismaClient,
  customStoriesGlobalEnabled: boolean
) {
  const prismaAny = prisma as PrismaWithGenerationSettings;
  const generationSettings = prismaAny.generationSettings;
  if (!generationSettings) {
    await ensureGenerationSettingsTable(prismaAny);
    await prismaAny.$executeRawUnsafe?.(
      'INSERT INTO generation_settings (id, custom_stories_global_enabled, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET custom_stories_global_enabled = EXCLUDED.custom_stories_global_enabled, updated_at = NOW()',
      'global',
      customStoriesGlobalEnabled
    );
    return { customStoriesGlobalEnabled };
  }

  const updated = await generationSettings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      customStoriesGlobalEnabled,
    },
    update: {
      customStoriesGlobalEnabled,
    },
  });
  return { customStoriesGlobalEnabled: Boolean(updated.customStoriesGlobalEnabled) };
}
