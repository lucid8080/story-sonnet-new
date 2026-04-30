import prisma from '@/lib/prisma';
import {
  CUSTOM_STORIES_FEATURE_TAG,
  hasCustomStoriesAccess,
  normalizeFeatureTags,
} from '@/lib/features/customStoriesAccessCore';

export {
  CUSTOM_STORIES_FEATURE_TAG,
  hasCustomStoriesAccess,
  normalizeFeatureTags,
};

export async function getViewerCustomStoriesAccess(userId: string) {
  const generationSettingsModel = (prisma as typeof prisma & {
    generationSettings?: {
      findUnique: (args: unknown) => Promise<{ customStoriesGlobalEnabled?: boolean } | null>;
    };
  }).generationSettings;

  const [profile, generationSettings] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { role: true, internalTags: true },
    }),
    generationSettingsModel
      ? generationSettingsModel.findUnique({
          where: { id: 'global' },
          select: { customStoriesGlobalEnabled: true },
        })
      : Promise.resolve(null),
  ]);

  const role = profile?.role ?? 'user';
  const internalTags = normalizeFeatureTags(profile?.internalTags);
  const customStoriesGlobalEnabled =
    generationSettings?.customStoriesGlobalEnabled ?? false;
  return {
    role,
    internalTags,
    customStoriesGlobalEnabled,
    hasAccess: hasCustomStoriesAccess({
      role,
      internalTags,
      customStoriesGlobalEnabled,
    }),
  };
}
