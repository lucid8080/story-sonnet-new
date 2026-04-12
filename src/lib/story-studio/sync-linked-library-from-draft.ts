import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { upsertStoryFromAdmin } from '@/lib/stories';
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

export function buildValidatedLibraryPayloadFromDraft(
  draft: StoryStudioDraftWithLibraryIncludes
):
  | { ok: true; payload: ReturnType<typeof draftToAdminUpsertInput> }
  | { ok: false; message: string } {
  const payload = draftToAdminUpsertInput(draft);
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
  if (!draft.episodes.length) {
    return {
      ok: false,
      message:
        'No episodes on this draft. Generate a script or add episode text before syncing.',
    };
  }

  const built = buildValidatedLibraryPayloadFromDraft(draft);
  if (!built.ok) {
    return { ok: false, message: built.message };
  }

  try {
    await upsertStoryFromAdmin(
      draft.linkedStoryId.toString(),
      built.payload
    );
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Library sync failed.';
    return { ok: false, message };
  }
}
