import type { CampaignStatus, PrismaClient } from '@prisma/client';

type Db = Pick<PrismaClient, 'campaignStatusHistory'>;

export async function recordCampaignStatusChange(
  prisma: Db,
  params: {
    campaignId: string;
    fromStatus: CampaignStatus | null;
    toStatus: CampaignStatus;
    actorUserId: string | null;
  }
) {
  await prisma.campaignStatusHistory.create({
    data: {
      campaignId: params.campaignId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      actorUserId: params.actorUserId,
    },
  });
}
