import { describe, expect, it } from 'vitest';
import {
  draftToAdminUpsertInput,
  fullDescriptionFromBrief,
} from '@/lib/story-studio/mapping/draft-to-admin-upsert';
import { notesWithLibraryEpisodeId } from '@/lib/story-studio/library-episode-link';
import type { BriefPayloadParsed } from '@/lib/story-studio/schemas/llm-output';

const sampleBrief = {
  seriesTitle: 'Lantern Library',
  summary:
    'A gentle adventure about a curious fox who discovers a library of glowing books.',
  logline: 'A fox finds magic in stories.',
  characters: ['Juniper the fox', 'Owl the librarian'],
  settingSketch: 'A moonlit forest library filled with lanterns.',
  suggestedGenre: 'fantasy' as const,
  suggestedMood: 'bedtime' as const,
  ageRange: '3-5' as const,
  episodeOutline: [
    { title: 'The First Lantern', beat: 'Juniper finds the door.' },
    { title: 'Borrowed Light', beat: 'She learns to share stories.' },
  ],
  coverArtPrompt: 'soft watercolor fox with lantern',
  musicPrompt: 'gentle harp',
  estimatedRuntimeMinutes: 12,
  safetyNotes: 'age-safe',
  characterGuides: [],
  sceneGuides: [],
} satisfies BriefPayloadParsed;

describe('fullDescriptionFromBrief', () => {
  it('composes parent-facing brief fields and skips production prompts', () => {
    const text = fullDescriptionFromBrief(sampleBrief);
    expect(text).toContain(sampleBrief.summary);
    expect(text).toContain(sampleBrief.logline);
    expect(text).toContain(sampleBrief.settingSketch);
    expect(text).toContain('- Juniper the fox');
    expect(text).toContain('The First Lantern — Juniper finds the door.');
    expect(text).not.toContain(sampleBrief.coverArtPrompt);
    expect(text).not.toContain(sampleBrief.musicPrompt);
    expect(text).not.toContain(sampleBrief.safetyNotes);
  });

  it('omits logline when it is already contained in summary', () => {
    const text = fullDescriptionFromBrief({
      ...sampleBrief,
      summary: 'A fox finds magic in stories. More parent copy here.',
      logline: 'A fox finds magic in stories.',
    });
    expect(text).toBeTruthy();
    expect(text!.split('A fox finds magic in stories.').length - 1).toBe(1);
  });

  it('returns null when brief is missing', () => {
    expect(fullDescriptionFromBrief(null)).toBeNull();
    expect(fullDescriptionFromBrief(undefined)).toBeNull();
  });
});

describe('draftToAdminUpsertInput', () => {
  it('fills fullDescription from brief, not episode script text', () => {
    const dialog =
      'NARRATOR: Hello there. JUNIPER: I found a lantern!';
    const payload = draftToAdminUpsertInput({
      id: 'draft-1',
      seriesTitle: 'Lantern Library',
      slug: 'lantern-library',
      brief: sampleBrief,
      scriptPackage: {
        seriesTitle: 'Lantern Library',
        summary: 'Short card blurb from script package.',
        fullScript: dialog,
        coverArtPrompt: '',
        musicPrompt: '',
        narrationNotes: '',
        ageRange: '3-5',
        estimatedRuntimeMinutes: 12,
        tags: [],
        episodes: [
          {
            title: 'The First Lantern',
            summary: 'Episode blurb',
            scriptText: dialog,
          },
        ],
      },
      request: { format: 'one-shot', autoPublish: false },
      preset: null,
      episodes: [
        {
          id: 'studio-ep-1',
          draftId: 'draft-1',
          sortOrder: 0,
          title: 'The First Lantern',
          scriptText: dialog,
          summary: 'Episode blurb',
          estimatedDurationSeconds: null,
          notes: null,
        },
      ],
      assets: [],
    } as Parameters<typeof draftToAdminUpsertInput>[0]);

    expect(payload.summary).toBe('Short card blurb from script package.');
    expect(payload.fullDescription).toContain(sampleBrief.summary);
    expect(payload.fullDescription).toContain(sampleBrief.settingSketch);
    expect(payload.fullDescription).not.toContain(dialog);
    expect(payload.episodes[0].transcriptLines).toEqual([
      { id: 1, text: dialog },
    ]);
  });

  it('leaves fullDescription null when brief is missing even if script exists', () => {
    const dialog = 'Once upon a time there was dialog only.';
    const payload = draftToAdminUpsertInput({
      id: 'draft-1',
      seriesTitle: 'No Brief',
      slug: 'no-brief',
      brief: null,
      scriptPackage: {
        seriesTitle: 'No Brief',
        summary: 'Script package summary.',
        fullScript: dialog,
        coverArtPrompt: '',
        musicPrompt: '',
        narrationNotes: '',
        ageRange: '3-5',
        estimatedRuntimeMinutes: 8,
        tags: [],
        episodes: [
          {
            title: 'Only Episode',
            summary: 'Blurb',
            scriptText: dialog,
          },
        ],
      },
      request: { format: 'one-shot', autoPublish: false },
      preset: null,
      episodes: [
        {
          id: 'studio-ep-1',
          draftId: 'draft-1',
          sortOrder: 0,
          title: 'Only Episode',
          scriptText: dialog,
          summary: 'Blurb',
          estimatedDurationSeconds: null,
          notes: null,
        },
      ],
      assets: [],
    } as Parameters<typeof draftToAdminUpsertInput>[0]);

    expect(payload.summary).toBe('Script package summary.');
    expect(payload.fullDescription).toBeNull();
  });

  it('prefers script summary over brief summary for short description', () => {
    const payload = draftToAdminUpsertInput({
      id: 'draft-1',
      seriesTitle: 'Lantern Library',
      slug: 'lantern-library',
      brief: sampleBrief,
      scriptPackage: {
        seriesTitle: 'Lantern Library',
        summary: 'Prefer this short summary.',
        coverArtPrompt: '',
        musicPrompt: '',
        narrationNotes: '',
        ageRange: '3-5',
        estimatedRuntimeMinutes: 12,
        tags: [],
        episodes: [
          {
            title: 'Ep',
            summary: 'Blurb',
            scriptText: 'Spoken words.',
          },
        ],
      },
      request: { format: 'one-shot', autoPublish: false },
      preset: null,
      episodes: [],
      assets: [],
    } as Parameters<typeof draftToAdminUpsertInput>[0]);

    expect(payload.summary).toBe('Prefer this short summary.');
    expect(payload.fullDescription).toContain(sampleBrief.summary);
  });

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
          isFreePreviewRequiresSignup: false,
          label: 'Part 1',
          slug: null,
          amazonBookUrl: 'https://www.amazon.com/dp/B0LIBRARY01',
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
    expect(payload.episodes[0].isFreePreviewRequiresSignup).toBe(false);
    expect(payload.episodes[0].amazonBookUrl).toBe(
      'https://www.amazon.com/dp/B0LIBRARY01'
    );
  });

  it('publishes new studio episodes when the linked story is already published', () => {
    const payload = draftToAdminUpsertInput({
      id: 'draft-1',
      seriesTitle: 'Test series',
      slug: 'test-series',
      brief: null,
      scriptPackage: null,
      request: { format: 'mini-series', autoPublish: false },
      preset: null,
      linkedStoryIsPublished: true,
      episodes: [
        {
          id: 'studio-ep-new',
          draftId: 'draft-1',
          sortOrder: 0,
          title: 'New episode',
          scriptText: 'Fresh script text for the new episode.',
          summary: null,
          estimatedDurationSeconds: null,
          notes: null,
        },
      ],
      assets: [],
      libraryEpisodes: [],
    } as Parameters<typeof draftToAdminUpsertInput>[0]);

    expect(payload.episodes[0].isPublished).toBe(true);
    expect(payload.isPublished).toBe(false);
  });

  it('keeps intentionally unpublished linked episodes unpublished', () => {
    const payload = draftToAdminUpsertInput({
      id: 'draft-1',
      seriesTitle: 'Test series',
      slug: 'test-series',
      brief: null,
      scriptPackage: null,
      request: { format: 'mini-series', autoPublish: true },
      preset: null,
      linkedStoryIsPublished: true,
      episodes: [
        {
          id: 'studio-ep-1',
          draftId: 'draft-1',
          sortOrder: 0,
          title: 'Hidden ep',
          scriptText: 'Script',
          summary: null,
          estimatedDurationSeconds: null,
          notes: notesWithLibraryEpisodeId(null, '7'),
        },
      ],
      assets: [],
      libraryEpisodes: [
        {
          id: BigInt(7),
          episodeNumber: 1,
          title: 'Hidden ep',
          description: null,
          audioStorageKey: null,
          audioUrl: null,
          durationSeconds: null,
          isPublished: false,
          isPremium: false,
          isFreePreview: false,
          isFreePreviewRequiresSignup: false,
          label: null,
          slug: null,
          amazonBookUrl: null,
        },
      ],
    } as Parameters<typeof draftToAdminUpsertInput>[0]);

    expect(payload.episodes[0].isPublished).toBe(false);
  });
});
