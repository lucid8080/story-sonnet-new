import { describe, expect, it } from 'vitest';
import {
  mergeLibraryStoryPreserveFields,
  type ExistingLibraryStoryFields,
} from '@/lib/story-studio/mapping/merge-library-story-preserve';
import type { AdminStoryUpsertInput } from '@/lib/validation/storySchema';

function basePayload(
  overrides: Partial<AdminStoryUpsertInput> = {}
): AdminStoryUpsertInput {
  return {
    slug: 'test-series',
    seriesTitle: 'Test series',
    subtitle: null,
    summary: 'A short summary.',
    fullDescription: null,
    coverUrl: null,
    accent: null,
    ageRange: '6-8',
    genre: null,
    mood: null,
    durationMinutes: 5,
    durationBucket: '5-10',
    durationLabel: null,
    isSeries: true,
    seriesTagline: null,
    universe: null,
    readingLevel: null,
    topics: [],
    characterTags: [],
    cardTitleOverride: null,
    cardDescriptionOverride: null,
    badgeLabelOverride: null,
    popularityScore: 10,
    sortPriority: 0,
    publishedAt: null,
    isFeatured: false,
    hideFromCatalog: false,
    isPremium: false,
    isPublished: false,
    metaTitle: null,
    metaDescription: null,
    ageGroup: null,
    narratorIds: [],
    episodes: [],
    ...overrides,
  };
}

function existing(
  overrides: Partial<ExistingLibraryStoryFields> = {}
): ExistingLibraryStoryFields {
  return {
    coverUrl: 'https://cdn.example/covers/test_display.webp',
    accent: '#1a2b3c',
    isPublished: true,
    publishedAt: new Date('2026-01-15T12:00:00.000Z'),
    isFeatured: true,
    hideFromCatalog: false,
    isPremium: true,
    popularityScore: 42,
    sortPriority: 7,
    metaTitle: 'SEO title',
    metaDescription: 'SEO desc',
    ageGroup: '6-8',
    cardTitleOverride: 'Card title',
    cardDescriptionOverride: 'Card desc',
    badgeLabelOverride: 'New',
    universe: 'Meadow',
    readingLevel: 'early',
    characterTags: ['nori'],
    narratorIds: ['narr-1'],
    ...overrides,
  };
}

describe('mergeLibraryStoryPreserveFields', () => {
  it('keeps published + cover when draft has no cover and autoPublish is false', () => {
    const merged = mergeLibraryStoryPreserveFields(
      basePayload({ isPublished: false, coverUrl: null }),
      existing()
    );

    expect(merged.isPublished).toBe(true);
    expect(merged.coverUrl).toBe(
      'https://cdn.example/covers/test_display.webp'
    );
    expect(merged.publishedAt).toBe('2026-01-15T12:00:00.000Z');
    expect(merged.accent).toBe('#1a2b3c');
    expect(merged.isFeatured).toBe(true);
    expect(merged.isPremium).toBe(true);
    expect(merged.popularityScore).toBe(42);
    expect(merged.sortPriority).toBe(7);
    expect(merged.narratorIds).toEqual(['narr-1']);
    expect(merged.characterTags).toEqual(['nori']);
    expect(merged.metaTitle).toBe('SEO title');
  });

  it('updates cover when the draft provides one', () => {
    const merged = mergeLibraryStoryPreserveFields(
      basePayload({
        coverUrl: 'https://cdn.example/covers/new_display.webp',
        isPublished: false,
      }),
      existing()
    );

    expect(merged.coverUrl).toBe(
      'https://cdn.example/covers/new_display.webp'
    );
    expect(merged.isPublished).toBe(true);
  });

  it('can publish via autoPublish even when existing is unpublished', () => {
    const merged = mergeLibraryStoryPreserveFields(
      basePayload({ isPublished: true, coverUrl: null }),
      existing({
        isPublished: false,
        publishedAt: null,
      })
    );

    expect(merged.isPublished).toBe(true);
    expect(merged.publishedAt).toBeTruthy();
    expect(merged.coverUrl).toBe(
      'https://cdn.example/covers/test_display.webp'
    );
  });

  it('does not unpublish an already-published story', () => {
    const merged = mergeLibraryStoryPreserveFields(
      basePayload({ isPublished: false }),
      existing({ isPublished: true })
    );
    expect(merged.isPublished).toBe(true);
  });
});
