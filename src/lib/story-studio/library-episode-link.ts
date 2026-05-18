import type { Prisma } from '@prisma/client';
import type { TranscriptLineJson } from '@/lib/transcripts/from-script';
import { transcriptLinesToScriptText } from '@/lib/transcripts/from-script';

const NOTES_LIBRARY_EPISODE_ID = 'libraryEpisodeId';

export type DraftEpisodeNotes = {
  libraryEpisodeId?: string;
};

export function readLibraryEpisodeIdFromNotes(
  notes: Prisma.JsonValue | null | undefined
): string | null {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
    return null;
  }
  const raw = (notes as DraftEpisodeNotes).libraryEpisodeId;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) {
    return null;
  }
  return raw.trim();
}

export function notesWithLibraryEpisodeId(
  notes: Prisma.JsonValue | null | undefined,
  libraryEpisodeId: string
): Prisma.InputJsonValue {
  const base =
    notes && typeof notes === 'object' && !Array.isArray(notes)
      ? { ...(notes as Record<string, unknown>) }
      : {};
  return {
    ...base,
    [NOTES_LIBRARY_EPISODE_ID]: libraryEpisodeId,
  } as Prisma.InputJsonValue;
}

export function parseLibraryTranscriptLines(
  value: Prisma.JsonValue | null | undefined
): TranscriptLineJson[] | undefined {
  if (value == null || !Array.isArray(value)) return undefined;
  const out: TranscriptLineJson[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    const id = o.id;
    const text = o.text;
    if (typeof text !== 'string') continue;
    if (typeof id === 'string' || typeof id === 'number') {
      out.push({ id, text });
    }
  }
  return out.length ? out : undefined;
}

export function scriptTextFromLibraryEpisode(ep: {
  transcriptLines: Prisma.JsonValue | null;
}): string {
  const lines = parseLibraryTranscriptLines(ep.transcriptLines);
  if (!lines?.length) return '';
  return transcriptLinesToScriptText(lines);
}
