import type { AdminStoryUpsertInput } from '@/lib/validation/storySchema';

/** Library story fields that Story Studio sync must not wipe. */
export type ExistingLibraryStoryFields = {
  coverUrl: string | null;
  accent: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  isFeatured: boolean;
  hideFromCatalog: boolean;
  isPremium: boolean;
  popularityScore: number;
  sortPriority: number;
  metaTitle: string | null;
  metaDescription: string | null;
  ageGroup: string | null;
  cardTitleOverride: string | null;
  cardDescriptionOverride: string | null;
  badgeLabelOverride: string | null;
  universe: string | null;
  readingLevel: string | null;
  characterTags: string[];
  narratorIds: string[];
};

/**
 * When syncing a linked draft → library story, keep admin-owned publishing /
 * discovery fields unless the draft explicitly provides a better value
 * (cover URL, autoPublish → published).
 */
export function mergeLibraryStoryPreserveFields(
  payload: AdminStoryUpsertInput,
  existing: ExistingLibraryStoryFields
): AdminStoryUpsertInput {
  const draftCover = payload.coverUrl?.trim() || null;
  const coverUrl = draftCover ?? existing.coverUrl;

  const wantPublish = payload.isPublished === true;
  const isPublished = wantPublish || existing.isPublished;

  let publishedAt = payload.publishedAt ?? null;
  if (isPublished) {
    if (existing.publishedAt) {
      publishedAt = existing.publishedAt.toISOString();
    } else if (wantPublish && !publishedAt) {
      publishedAt = new Date().toISOString();
    }
  } else if (!publishedAt && existing.publishedAt) {
    publishedAt = existing.publishedAt.toISOString();
  }

  const characterTags =
    payload.characterTags.length > 0
      ? payload.characterTags
      : existing.characterTags;

  const narratorIds =
    payload.narratorIds.length > 0
      ? payload.narratorIds
      : existing.narratorIds;

  return {
    ...payload,
    coverUrl,
    accent: payload.accent ?? existing.accent,
    isPublished,
    publishedAt,
    isFeatured: existing.isFeatured,
    hideFromCatalog: existing.hideFromCatalog,
    isPremium: existing.isPremium,
    popularityScore: existing.popularityScore,
    sortPriority: existing.sortPriority,
    metaTitle: payload.metaTitle ?? existing.metaTitle,
    metaDescription: payload.metaDescription ?? existing.metaDescription,
    ageGroup: payload.ageGroup ?? existing.ageGroup,
    cardTitleOverride: payload.cardTitleOverride ?? existing.cardTitleOverride,
    cardDescriptionOverride:
      payload.cardDescriptionOverride ?? existing.cardDescriptionOverride,
    badgeLabelOverride:
      payload.badgeLabelOverride ?? existing.badgeLabelOverride,
    universe: payload.universe ?? existing.universe,
    readingLevel: payload.readingLevel ?? existing.readingLevel,
    characterTags,
    narratorIds,
  };
}
