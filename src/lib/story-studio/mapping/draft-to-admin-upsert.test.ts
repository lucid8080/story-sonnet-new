import { describe, expect, it } from 'vitest';
import { draftToAdminUpsertInput } from '@/lib/story-studio/mapping/draft-to-admin-upsert';
import { notesWithLibraryEpisodeId } from '@/lib/story-studio/library-episode-link';

describe('draftToAdminUpsertInput', () => {
  it('uses library episode id and preserves manual audio when linked', () => {
    const payload = draftToAdminUpsertInput({
      id: 'draft-1',
      seriesTitle: 'Test series',
      slug: 'test-series',
      brief: null,
      scriptPackage: null,
      request: { format: 'mini-series', autoPublish: false },
      preset: null,
      episodes: [
        {
          id: 'studio-ep-1',
          draftId: 'draft-1',
          sortOrder: 0,
          title: 'Manual episode',
          scriptText: 'Hello from the script tab.',
          summary: 'A teaser',
          estimatedDurationSeconds: null,
          notes: notesWithLibraryEpisodeId(null, '42'),
        },
      ],
      assets: [],
      libraryEpisodes: [
        {
          id: BigInt(42),
          episodeNumber: 1,
          title: 'Library title',
          description: 'Library blurb',
          audioStorageKey: 'audio/test/episode-1.mp3',
          audioUrl: null,
          durationSeconds: 120,
          isPublished: true,
          isPremium: false,
          isFreePreview: true,
          label: 'Part 1',
          slug: null,
        },
      ],
    } as Parameters<typeof draftToAdminUpsertInput>[0]);

    expect(payload.episodes).toHaveLength(1);
    expect(payload.episodes[0].id).toBe('42');
    expect(payload.episodes[0].audioStorageKey).toBe(
      'audio/test/episode-1.mp3'
    );
    expect(payload.episodes[0].transcriptLines).toEqual([
      { id: 1, text: 'Hello from the script tab.' },
    ]);
    expect(payload.episodes[0].isPublished).toBe(true);
  });
});
