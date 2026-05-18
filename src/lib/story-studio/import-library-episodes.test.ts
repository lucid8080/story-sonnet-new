import { describe, expect, it } from 'vitest';
import { notesWithLibraryEpisodeId } from '@/lib/story-studio/library-episode-link';

/**
 * Mirrors pick logic in import-library-episodes (inline for unit tests).
 */
function pickPreferredDraftForLibraryId(
  rows: {
    id: string;
    title: string;
    scriptText: string;
    notes: ReturnType<typeof notesWithLibraryEpisodeId> | null;
  }[]
) {
  return rows.reduce((best, row) => {
    const score = (r: typeof row) =>
      r.scriptText.trim().length * 10 + r.title.trim().length;
    return score(row) > score(best) ? row : best;
  });
}

describe('library draft import pairing', () => {
  it('prefers the draft row with more script when two link to the same library episode', () => {
    const libId = '99';
    const rows = [
      {
        id: 'stale',
        title: 'Anansi and the Sky God',
        scriptText: 'x'.repeat(4114),
        notes: notesWithLibraryEpisodeId(null, libId),
      },
      {
        id: 'current',
        title: "The Sky God's Stories",
        scriptText: 'y'.repeat(7294),
        notes: notesWithLibraryEpisodeId(null, libId),
      },
    ];
    const picked = pickPreferredDraftForLibraryId(rows);
    expect(picked.id).toBe('current');
  });

  it('does not assign unlinked drafts to library episodes by position', () => {
    const libraryOrder = [
      { id: '1', title: 'The Pot of Wisdom' },
      { id: '2', title: "The Sky God's Stories" },
    ];
    const unlinkedDraft = {
      id: 'old-studio',
      title: 'Anansi and the Sky God',
      libraryEpisodeId: null as string | null,
    };

    const linkedByLibId = new Map<string, string>();
    for (const lib of libraryOrder) {
      const libId = lib.id;
      if (linkedByLibId.has(libId)) continue;
      if (unlinkedDraft.libraryEpisodeId === libId) {
        linkedByLibId.set(libId, unlinkedDraft.id);
      }
    }

    expect(linkedByLibId.size).toBe(0);
  });
});
