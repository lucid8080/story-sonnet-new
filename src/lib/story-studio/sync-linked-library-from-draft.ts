import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { upsertStoryFromAdmin } from '@/lib/stories';
import {
  importLibraryEpisodesIntoDraft,
  reconcileDraftEpisodeLibraryLinks,
} from '@/lib/story-studio/import-library-episodes';
import { draftToAdminUpsertInput } from '@/lib/story-studio/mapping/draft-to-admin-upsert';
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
      label: true,
      slug: true,
    },
  });
}

export async function buildValidatedLibraryPayloadFromDraft(
  draft: StoryStudioDraftWithLibraryIncludes
): Promise<
  | { ok: true; payload: ReturnType<typeof draftToAdminUpsertInput> }
  | { ok: false; message: string }
> {
  const libraryEpisodes = await loadLibraryEpisodesForDraft(
    draft.linkedStoryId
  );
  const payload = draftToAdminUpsertInput({ ...draft, libraryEpisodes });
  if (!isValidStorySlug(payload.slug)) {
    return {
      ok: false,
      message:
        'Invalid story slug. Use lowercase letters, numbers, and hyphens only (edit slug in Story Studio).',
    };
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
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Library sync failed.';
    return { ok: false, message };
  }
}
