import type { PrismaClient } from '@prisma/client';

export async function getOrCreateCampaignSettings(prisma: PrismaClient) {
  return prisma.campaignSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  });
}

export function parseTestUserIds(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === 'string' && x.length > 0);
}
