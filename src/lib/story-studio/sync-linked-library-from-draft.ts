import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { upsertStoryFromAdmin } from '@/lib/stories';
import { revalidateStoryCatalog } from '@/lib/revalidateStoryCatalog';
import {
  importLibraryEpisodesIntoDraft,
  reconcileDraftEpisodeLibraryLinks,
} from '@/lib/story-studio/import-library-episodes';
import { draftToAdminUpsertInput } from '@/lib/story-studio/mapping/draft-to-admin-upsert';
import {
  mergeLibraryStoryPreserveFields,
  type ExistingLibraryStoryFields,
} from '@/lib/story-studio/mapping/merge-library-story-preserve';
import type { AdminStoryUpsertInput } from '@/lib/validation/storySchema';
import { isValidStorySlug } from '@/lib/slug';

/** Same includes as push-to-library and TTS library sync. */
export const storyStudioDraftIncludeForLibrary = {
  preset: true,
  episodes: { orderBy: { sortOrder: 'asc' as const } },
  assets: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.StoryStudioDraftInclude;

export type StoryStudioDraftWithLibraryIncludes =
  Prisma.StoryStudioDraftGetPayload<{
    include: typeof storyStudioDraftIncludeForLibrary;
  }>;

export type SyncLinkedLibraryResult =
  | { ok: true; skipped?: true }
  | { ok: false; message: string };

async function loadLibraryEpisodesForDraft(
  linkedStoryId: bigint | null
) {
  if (linkedStoryId == null) return [];
  return prisma.episode.findMany({
    where: { storyId: linkedStoryId },
    orderBy: { episodeNumber: 'asc' },
    select: {
      id: true,
      episodeNumber: true,
      title: true,
      description: true,
      audioStorageKey: true,
      audioUrl: true,
      durationSeconds: true,
      isPublished: true,
      isPremium: true,
      isFreePreview: true,
      isFreePreviewRequiresSignup: true,
      label: true,
      slug: true,
      amazonBookUrl: true,
    },
  });
}

async function loadExistingLibraryStoryFields(
  linkedStoryId: bigint
): Promise<ExistingLibraryStoryFields | null> {
  const row = await prisma.story.findUnique({
    where: { id: linkedStoryId },
    select: {
      coverUrl: true,
      accent: true,
      isPublished: true,
      publishedAt: true,
      isFeatured: true,
      hideFromCatalog: true,
      isPremium: true,
      popularityScore: true,
      sortPriority: true,
      metaTitle: true,
      metaDescription: true,
      ageGroup: true,
      cardTitleOverride: true,
      cardDescriptionOverride: true,
      badgeLabelOverride: true,
      universe: true,
      readingLevel: true,
      characterTags: true,
      storyNarrators: { select: { narratorId: true } },
    },
  });
  if (!row) return null;
  const characterTags = Array.isArray(row.characterTags)
    ? row.characterTags.filter((t): t is string => typeof t === 'string')
    : [];
  return {
    coverUrl: row.coverUrl,
    accent: row.accent,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt,
    isFeatured: row.isFeatured,
    hideFromCatalog: row.hideFromCatalog,
    isPremium: row.isPremium,
    popularityScore: row.popularityScore,
    sortPriority: row.sortPriority,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    ageGroup: row.ageGroup,
    cardTitleOverride: row.cardTitleOverride,
    cardDescriptionOverride: row.cardDescriptionOverride,
    badgeLabelOverride: row.badgeLabelOverride,
    universe: row.universe,
    readingLevel: row.readingLevel,
    characterTags,
    narratorIds: row.storyNarrators.map((n) => n.narratorId),
  };
}

export async function buildValidatedLibraryPayloadFromDraft(
  draft: StoryStudioDraftWithLibraryIncludes
): Promise<
  | { ok: true; payload: AdminStoryUpsertInput }
  | { ok: false; message: string }
> {
  const libraryEpisodes = await loadLibraryEpisodesForDraft(
    draft.linkedStoryId
  );

  let existing: ExistingLibraryStoryFields | null = null;
  if (draft.linkedStoryId != null) {
    existing = await loadExistingLibraryStoryFields(draft.linkedStoryId);
  }

  let payload = draftToAdminUpsertInput({
    ...draft,
    libraryEpisodes,
    linkedStoryIsPublished: existing?.isPublished === true,
  });
  if (!isValidStorySlug(payload.slug)) {
    return {
      ok: false,
      message:
        'Invalid story slug. Use lowercase letters, numbers, and hyphens only (edit slug in Story Studio).',
    };
  }

  if (existing) {
    payload = mergeLibraryStoryPreserveFields(payload, existing);
  }

  return { ok: true, payload };
}

/**
 * When the draft is already linked to a library story, runs the same upsert as
 * "Push to story library" so `Episode.audioStorageKey` and other fields match the draft.
 * No-op when `linkedStoryId` is null (first push still required to create the story).
 */
export async function syncLinkedLibraryFromDraft(
  draftId: string
): Promise<SyncLinkedLibraryResult> {
  const draft = await prisma.storyStudioDraft.findUnique({
    where: { id: draftId },
    include: storyStudioDraftIncludeForLibrary,
  });

  if (!draft) {
    return { ok: false, message: 'Draft not found.' };
  }
  if (!draft.linkedStoryId) {
    return { ok: true, skipped: true };
  }

  await importLibraryEpisodesIntoDraft(draft.id, draft.linkedStoryId);

  const draftAfterImport = await prisma.storyStudioDraft.findUnique({
    where: { id: draftId },
    include: storyStudioDraftIncludeForLibrary,
  });
  if (!draftAfterImport) {
    return { ok: false, message: 'Draft not found.' };
  }
  if (!draftAfterImport.episodes.length) {
    return {
      ok: false,
      message:
        'No episodes on this draft. Generate a script or add episode text before syncing.',
    };
  }

  const built = await buildValidatedLibraryPayloadFromDraft(draftAfterImport);
  if (!built.ok) {
    return { ok: false, message: built.message };
  }

  try {
    await upsertStoryFromAdmin(
      draftAfterImport.linkedStoryId!.toString(),
      built.payload
    );
    await reconcileDraftEpisodeLibraryLinks(
      draftAfterImport.id,
      draftAfterImport.linkedStoryId!
    );
    revalidateStoryCatalog(built.payload.slug);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Library sync failed.';
    return { ok: false, message };
  }
}
