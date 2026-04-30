import type { PrismaClient } from '@prisma/client';

export async function getOrCreateGenerationSettings(prisma: PrismaClient) {
  const generationSettings = (prisma as PrismaClient & {
    generationSettings?: {
      upsert: (args: unknown) => Promise<{ customStoriesGlobalEnabled?: boolean }>;
    };
  }).generationSettings;
  if (!generationSettings) {
    return { customStoriesGlobalEnabled: false };
  }
  return generationSettings.upsert({
    where: { id: 'global' },
    create: { id: 'global' },
    update: {},
  });
}
