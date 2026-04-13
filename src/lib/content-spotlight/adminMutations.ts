import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { ContentSpotlightUpsertInput } from '@/lib/validation/contentSpotlightSchema';

function parseDate(s: string): Date {
  return new Date(s);
}

function baseData(
  input: ContentSpotlightUpsertInput
): Omit<Prisma.ContentSpotlightCreateInput, 'stories'> {
  return {
    internalName: input.internalName,
    title: input.title,
    slug: input.slug,
    type: input.type,
    shortBlurb: input.shortBlurb,
    longDescription: input.longDescription ?? null,
    popupTitle: input.popupTitle,
    popupBody: input.popupBody,
    infoBarText: input.infoBarText,
    ctaLabel: input.ctaLabel?.trim() ? input.ctaLabel : null,
    ctaUrl: input.ctaUrl?.trim() ? input.ctaUrl : null,
    startAt: parseDate(input.startAt),
    endAt: parseDate(input.endAt),
    timezone: input.timezone ?? 'UTC',
    recurrence: input.recurrence ?? 'one_time',
    status: input.status ?? 'draft',
    publishedAt:
      input.publishedAt === undefined || input.publishedAt === null
        ? null
        : parseDate(input.publishedAt),
    showBadge: input.showBadge ?? true,
    badgeCorner: input.badgeCorner ?? 'bottom_right',
    showPopup: input.showPopup ?? true,
    showInfoBar: input.showInfoBar ?? true,
    featureOnHomepage: input.featureOnHomepage ?? false,
    featureOnLibraryPage: input.featureOnLibraryPage ?? false,
    priority: input.priority ?? 0,
    themeToken: input.themeToken?.trim() ? input.themeToken : null,
  };
}

function badgeAssetForCreate(
  input: ContentSpotlightUpsertInput
): Pick<Prisma.ContentSpotlightCreateInput, 'badgeAsset'> | Record<string, never> {
  const id = input.badgeAssetId?.trim();
  if (!id) return {};
  return { badgeAsset: { connect: { id } } };
}

function badgeAssetForUpdate(
  input: ContentSpotlightUpsertInput
): NonNullable<Prisma.ContentSpotlightUpdateInput['badgeAsset']> {
  const id = input.badgeAssetId?.trim();
  if (!id) return { disconnect: true };
  return { connect: { id } };
}

export async function createContentSpotlight(input: ContentSpotlightUpsertInput) {
  const stories = input.stories ?? [];
  return prisma.contentSpotlight.create({
    data: {
      ...baseData(input),
      ...badgeAssetForCreate(input),
      stories: {
        create: stories.map((s) => ({
          storyId: BigInt(s.storyId),
          sortOrder: s.sortOrder,
          isFeatured: s.isFeatured ?? false,
          cardTitleOverride: s.cardTitleOverride?.trim()
            ? s.cardTitleOverride
            : null,
        })),
      },
    },
    include: { stories: true, badgeAsset: true },
  });
}

export async function updateContentSpotlight(
  id: string,
  input: ContentSpotlightUpsertInput
) {
  const stories = input.stories ?? [];
  await prisma.$transaction([
    prisma.contentSpotlightStory.deleteMany({ where: { spotlightId: id } }),
    prisma.contentSpotlight.update({
      where: { id },
      data: {
        ...baseData(input),
        badgeAsset: badgeAssetForUpdate(input),
        stories: {
          create: stories.map((s) => ({
            storyId: BigInt(s.storyId),
            sortOrder: s.sortOrder,
            isFeatured: s.isFeatured ?? false,
            cardTitleOverride: s.cardTitleOverride?.trim()
              ? s.cardTitleOverride
              : null,
          })),
        },
      },
    }),
  ]);
  return prisma.contentSpotlight.findUniqueOrThrow({
    where: { id },
    include: { stories: { include: { story: true } }, badgeAsset: true },
  });
}

export async function duplicateContentSpotlight(id: string) {
  const orig = await prisma.contentSpotlight.findUnique({
    where: { id },
    include: { stories: true },
  });
  if (!orig) throw new Error('Spotlight not found');
  const suffix = Date.now().toString(36);
  const slug = `${orig.slug}-copy-${suffix}`.slice(0, 120);
  return prisma.contentSpotlight.create({
    data: {
      internalName: `${orig.internalName} (copy)`,
      title: `${orig.title} (copy)`,
      slug,
      type: orig.type,
      shortBlurb: orig.shortBlurb,
      longDescription: orig.longDescription,
      popupTitle: orig.popupTitle,
      popupBody: orig.popupBody,
      infoBarText: orig.infoBarText,
      ctaLabel: orig.ctaLabel,
      ctaUrl: orig.ctaUrl,
      startAt: orig.startAt,
      endAt: orig.endAt,
      timezone: orig.timezone,
      recurrence: orig.recurrence,
      status: 'draft',
      publishedAt: null,
      showBadge: orig.showBadge,
      badgeCorner: orig.badgeCorner,
      showPopup: orig.showPopup,
      showInfoBar: orig.showInfoBar,
      featureOnHomepage: orig.featureOnHomepage,
      featureOnLibraryPage: orig.featureOnLibraryPage,
      priority: orig.priority,
      themeToken: orig.themeToken,
      ...(orig.badgeAssetId
        ? { badgeAsset: { connect: { id: orig.badgeAssetId } } }
        : {}),
      stories: {
        create: orig.stories.map((s) => ({
          storyId: s.storyId,
          sortOrder: s.sortOrder,
          isFeatured: s.isFeatured,
          cardTitleOverride: s.cardTitleOverride,
        })),
      },
    },
    include: { stories: true, badgeAsset: true },
  });
}
