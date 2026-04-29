import type { Prisma } from '@prisma/client';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import { resolveDraftGenerationRequest } from '@/lib/story-studio/normalize-request';

export const draftInclude = {
  preset: true,
  episodes: { orderBy: { sortOrder: 'asc' as const } },
  assets: { orderBy: { createdAt: 'desc' as const }, take: 50 },
  jobs: { orderBy: { startedAt: 'desc' as const }, take: 20 },
} satisfies Prisma.StoryStudioDraftInclude;

export type DraftWithRelations = Prisma.StoryStudioDraftGetPayload<{
  include: typeof draftInclude;
}>;

function coverAssetImagePrompt(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as { imagePrompt?: unknown }).imagePrompt;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw;
}

export function serializeDraft(draft: DraftWithRelations) {
  const request = resolveDraftGenerationRequest(draft);
  return {
    id: draft.id,
    seriesTitle: draft.seriesTitle,
    slug: draft.slug,
    mode: draft.mode,
    presetId: draft.presetId,
    linkedStoryId: draft.linkedStoryId?.toString() ?? null,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    request,
    brief: draft.brief,
    scriptPackage: draft.scriptPackage,
    preset: draft.preset
      ? {
          id: draft.preset.id,
          slug: draft.preset.slug,
          name: draft.preset.name,
          description: draft.preset.description,
        }
      : null,
    episodes: draft.episodes.map((e) => ({
      id: e.id,
      sortOrder: e.sortOrder,
      title: e.title,
      scriptText: e.scriptText,
      summary: e.summary,
      estimatedDurationSeconds: e.estimatedDurationSeconds,
    })),
    assets: draft.assets.map((a) => ({
      id: a.id,
      kind: a.kind,
      storageKey: a.storageKey,
      publicUrl: resolvePublicAssetUrl(a.publicUrl) ?? a.publicUrl,
      mimeType: a.mimeType,
      vendor: a.vendor,
      draftEpisodeId: a.draftEpisodeId,
      createdAt: a.createdAt.toISOString(),
      imagePrompt:
        a.kind === 'cover' ? coverAssetImagePrompt(a.metadata) : null,
    })),
    jobs: draft.jobs.map((j) => ({
      id: j.id,
      step: j.step,
      status: j.status,
      errorMessage: j.errorMessage,
      startedAt: j.startedAt?.toISOString() ?? null,
      finishedAt: j.finishedAt?.toISOString() ?? null,
    })),
  };
}
