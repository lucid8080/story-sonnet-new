import prisma from '@/lib/prisma';

export async function computeEngagementTotals(userId: string) {
  const [likes, saves, comments, ratings, drafts] = await Promise.all([
    prisma.storySeriesLike.count({ where: { userId } }),
    prisma.userSavedStory.count({ where: { userId } }),
    prisma.storySeriesComment.count({ where: { userId } }),
    prisma.storySeriesRating.count({ where: { userId } }),
    prisma.storyStudioDraft.count({ where: { createdByUserId: userId } }),
  ]);
  const total = likes + saves + comments + ratings + drafts;
  return {
    likes,
    saves,
    comments,
    ratings,
    drafts,
    total,
  };
}

export async function syncProfileEngagementCount(userId: string) {
  const { total } = await computeEngagementTotals(userId);
  await prisma.profile.updateMany({
    where: { userId },
    data: { totalEngagementCount: total },
  });
  return total;
}
