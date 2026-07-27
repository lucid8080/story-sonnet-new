import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  notesWithLibraryEpisodeId,
  readLibraryEpisodeIdFromNotes,
  scriptTextFromLibraryEpisode,
} from '@/lib/story-studio/library-episode-link';

type LibraryEpisodeRow = {
  id: bigint;
  episodeNumber: number;
  title: string;
  description: string | null;
  transcriptLines: Prisma.JsonValue | null;
};

type DraftEpisodeRow = {
  id: string;
  sortOrder: number;
  title: string;
  scriptText: string;
  summary: string | null;
  notes: Prisma.JsonValue | null;
};

const libraryEpisodeSelect = {
  id: true,
  episodeNumber: true,
  title: true,
  description: true,
  transcriptLines: true,
} as const;

function pickPreferredDraftForLibraryId(
  rows: DraftEpisodeRow[]
): DraftEpisodeRow {
  return rows.reduce((best, row) => {
    const bestScore = draftEpisodeMatchScore(best);
    const rowScore = draftEpisodeMatchScore(row);
    return rowScore > bestScore ? row : best;
  });
}

function draftEpisodeMatchScore(row: DraftEpisodeRow): number {
  const scriptLen = row.scriptText.trim().length;
  const titleLen = row.title.trim().length;
  return scriptLen * 10 + titleLen;
}

function normalizeEpisodeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s+/g, ' ');
}

function titlesMatch(a: string, b: string): boolean {
  const na = normalizeEpisodeTitle(a);
  const nb = normalizeEpisodeTitle(b);
  return na.length > 0 && na === nb;
}

function buildLinkedDraftByLibraryId(
  draftEpisodes: DraftEpisodeRow[],
  libraryEpisodes: LibraryEpisodeRow[]
): Map<string, DraftEpisodeRow> {
  const linked = new Map<string, DraftEpisodeRow>();

  for (const lib of libraryEpisodes) {
    const libId = lib.id.toString();
    const candidates: DraftEpisodeRow[] = [];

    for (const row of draftEpisodes) {
      const noteLibId = readLibraryEpisodeIdFromNotes(row.notes);
      if (noteLibId === libId || titlesMatch(row.title, lib.title)) {
        candidates.push(row);
      }
    }

    if (candidates.length > 0) {
      linked.set(libId, pickPreferredDraftForLibraryId(candidates));
    }
  }

  return linked;
}

async function draftEpisodeHasGeneratedAssets(
  draftEpisodeId: string
): Promise<boolean> {
  const count = await prisma.storyStudioGeneratedAsset.count({
    where: { draftEpisodeId },
  });
  return count > 0;
}

/**
 * Ensures every library episode on a linked story has a matching draft row (by
 * `notes.libraryEpisodeId` only — never by track position). Aligns track order
 * and titles with the Story series library.
 */
export async function importLibraryEpisodesIntoDraft(
  draftId: string,
  linkedStoryId: bigint
): Promise<void> {
  const libraryEpisodes = await prisma.episode.findMany({
    where: { storyId: linkedStoryId },
    orderBy: { episodeNumber: 'asc' },
    select: libraryEpisodeSelect,
  });
  if (!libraryEpisodes.length) return;

  const draftEpisodes = await prisma.storyStudioDraftEpisode.findMany({
    where: { draftId },
    orderBy: { sortOrder: 'asc' },
  });

  const linkedByLibraryId = buildLinkedDraftByLibraryId(
    draftEpisodes,
    libraryEpisodes
  );
  const validLibraryIds = new Set(
    libraryEpisodes.map((l) => l.id.toString())
  );
  const usedDraftIds = new Set<string>();
  const winningDraftIds = new Set(
    [...linkedByLibraryId.values()].map((d) => d.id)
  );
  const duplicateDraftIds: string[] = [];

  for (const row of draftEpisodes) {
    if (winningDraftIds.has(row.id)) continue;

    const noteLibId = readLibraryEpisodeIdFromNotes(row.notes);
    const matchesLibrary =
      (noteLibId != null && validLibraryIds.has(noteLibId)) ||
      libraryEpisodes.some((lib) => titlesMatch(row.title, lib.title));

    if (matchesLibrary) {
      duplicateDraftIds.push(row.id);
    }
  }

  for (const lib of libraryEpisodes) {
    const libId = lib.id.toString();
    const draft = linkedByLibraryId.get(libId);

    if (!draft) {
      const scriptText = scriptTextFromLibraryEpisode(lib);
      await prisma.storyStudioDraftEpisode.create({
        data: {
          draftId,
          sortOrder: lib.episodeNumber - 1,
          title: lib.title,
          scriptText,
          summary: lib.description,
          notes: notesWithLibraryEpisodeId(null, libId),
        },
      });
      continue;
    }

    usedDraftIds.add(draft.id);
    const scriptText = draft.scriptText.trim()
      ? draft.scriptText
      : scriptTextFromLibraryEpisode(lib);

    await prisma.storyStudioDraftEpisode.update({
      where: { id: draft.id },
      data: {
        sortOrder: lib.episodeNumber - 1,
        title: lib.title,
        summary: lib.description?.trim()
          ? lib.description
          : draft.summary,
        scriptText,
        notes: notesWithLibraryEpisodeId(draft.notes, libId),
      },
    });
  }

  let studioOnlyOrder = libraryEpisodes.length;
  const deleteIds = new Set<string>(duplicateDraftIds);

  for (const row of draftEpisodes) {
    if (usedDraftIds.has(row.id) || deleteIds.has(row.id)) continue;

    const libId = readLibraryEpisodeIdFromNotes(row.notes);

    if (libId && !validLibraryIds.has(libId)) {
      deleteIds.add(row.id);
      continue;
    }

    if (!libId) {
      const hasAssets = await draftEpisodeHasGeneratedAssets(row.id);
      const hasScript = row.scriptText.trim().length > 0;
      if (!hasAssets && !hasScript) {
        deleteIds.add(row.id);
        continue;
      }
      await prisma.storyStudioDraftEpisode.update({
        where: { id: row.id },
        data: { sortOrder: studioOnlyOrder++ },
      });
    }
  }

  if (deleteIds.size > 0) {
    await prisma.storyStudioGeneratedAsset.updateMany({
      where: { draftEpisodeId: { in: [...deleteIds] } },
      data: { draftEpisodeId: null },
    });
    await prisma.storyStudioDraftEpisode.deleteMany({
      where: { id: { in: [...deleteIds] } },
    });
  }
}

/**
 * After a library upsert from a draft, write `notes.libraryEpisodeId` so the
 * next sync keeps numeric episode ids (avoids delete+recreate as unpublished).
 *
 * Matching order: keep valid existing links → title match → remaining by
 * sort/episode order (safe only immediately after upsert wrote that order).
 */
export async function reconcileDraftEpisodeLibraryLinks(
  draftId: string,
  linkedStoryId: bigint
): Promise<void> {
  const libraryEpisodes = await prisma.episode.findMany({
    where: { storyId: linkedStoryId },
    orderBy: { episodeNumber: 'asc' },
    select: { id: true, title: true, episodeNumber: true },
  });
  if (!libraryEpisodes.length) return;

  const draftEpisodes = await prisma.storyStudioDraftEpisode.findMany({
    where: { draftId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, title: true, sortOrder: true, notes: true },
  });
  if (!draftEpisodes.length) return;

  const plan = planDraftLibraryEpisodeReconcile(
    draftEpisodes.map((d) => ({
      id: d.id,
      title: d.title,
      notes: d.notes,
    })),
    libraryEpisodes.map((l) => ({
      id: l.id.toString(),
      title: l.title,
    }))
  );

  for (const row of draftEpisodes) {
    const libId = plan.get(row.id);
    if (!libId) continue;
    const current = readLibraryEpisodeIdFromNotes(row.notes);
    if (current === libId) continue;
    await prisma.storyStudioDraftEpisode.update({
      where: { id: row.id },
      data: { notes: notesWithLibraryEpisodeId(row.notes, libId) },
    });
  }
}

/** Pure pairing used by `reconcileDraftEpisodeLibraryLinks` (unit-tested). */
export function planDraftLibraryEpisodeReconcile(
  draftEpisodes: { id: string; title: string; notes: Prisma.JsonValue | null }[],
  libraryEpisodes: { id: string; title: string }[]
): Map<string, string> {
  const assignments = new Map<string, string>();
  const usedLibIds = new Set<string>();
  const validLibraryIds = new Set(libraryEpisodes.map((l) => l.id));

  for (const draft of draftEpisodes) {
    const libId = readLibraryEpisodeIdFromNotes(draft.notes);
    if (libId && validLibraryIds.has(libId) && !usedLibIds.has(libId)) {
      assignments.set(draft.id, libId);
      usedLibIds.add(libId);
    }
  }

  for (const draft of draftEpisodes) {
    if (assignments.has(draft.id)) continue;
    const match = libraryEpisodes.find(
      (lib) =>
        !usedLibIds.has(lib.id) && titlesMatch(draft.title, lib.title)
    );
    if (match) {
      assignments.set(draft.id, match.id);
      usedLibIds.add(match.id);
    }
  }

  const unpairedDrafts = draftEpisodes.filter((d) => !assignments.has(d.id));
  const unpairedLibs = libraryEpisodes.filter((l) => !usedLibIds.has(l.id));
  const n = Math.min(unpairedDrafts.length, unpairedLibs.length);
  for (let i = 0; i < n; i++) {
    assignments.set(unpairedDrafts[i].id, unpairedLibs[i].id);
  }

  return assignments;
}
