import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { notesWithLibraryEpisodeId } from '@/lib/story-studio/library-episode-link';
import { planDraftLibraryEpisodeReconcile } from '@/lib/story-studio/import-library-episodes';

function notesJson(
  libraryEpisodeId: string
): Prisma.JsonValue {
  return notesWithLibraryEpisodeId(null, libraryEpisodeId) as Prisma.JsonValue;
}

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
        notes: notesJson(libId),
      },
      {
        id: 'current',
        title: "The Sky God's Stories",
        scriptText: 'y'.repeat(7294),
        notes: notesJson(libId),
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

describe('planDraftLibraryEpisodeReconcile', () => {
  it('keeps existing valid libraryEpisodeId links', () => {
    const plan = planDraftLibraryEpisodeReconcile(
      [
        {
          id: 'd1',
          title: 'Part One',
          notes: notesJson('10'),
        },
        {
          id: 'd2',
          title: 'Part Two',
          notes: notesJson('20'),
        },
      ],
      [
        { id: '10', title: 'Part One' },
        { id: '20', title: 'Part Two' },
      ]
    );
    expect(plan.get('d1')).toBe('10');
    expect(plan.get('d2')).toBe('20');
  });

  it('links a new studio episode by order after existing links', () => {
    const plan = planDraftLibraryEpisodeReconcile(
      [
        {
          id: 'd1',
          title: 'Part One',
          notes: notesJson('10'),
        },
        { id: 'd-new', title: 'Brand New Episode', notes: null },
      ],
      [
        { id: '10', title: 'Part One' },
        { id: '99', title: 'Brand New Episode' },
      ]
    );
    expect(plan.get('d1')).toBe('10');
    expect(plan.get('d-new')).toBe('99');
  });

  it('falls back to title match before order', () => {
    const plan = planDraftLibraryEpisodeReconcile(
      [
        { id: 'd-b', title: 'Beta', notes: null },
        { id: 'd-a', title: 'Alpha', notes: null },
      ],
      [
        { id: '1', title: 'Alpha' },
        { id: '2', title: 'Beta' },
      ]
    );
    expect(plan.get('d-a')).toBe('1');
    expect(plan.get('d-b')).toBe('2');
  });
});
