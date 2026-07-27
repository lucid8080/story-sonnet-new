import { describe, expect, it } from 'vitest';
import { resolveEpisodePublishedForLibrarySync } from '@/lib/story-studio/mapping/episode-publish-for-sync';

describe('resolveEpisodePublishedForLibrarySync', () => {
  it('keeps an existing library episode unpublished when linked', () => {
    expect(
      resolveEpisodePublishedForLibrarySync({
        libraryEpisodeIsPublished: false,
        autoPublish: true,
        linkedStoryIsPublished: true,
      })
    ).toBe(false);
  });

  it('keeps an existing library episode published when linked', () => {
    expect(
      resolveEpisodePublishedForLibrarySync({
        libraryEpisodeIsPublished: true,
        autoPublish: false,
        linkedStoryIsPublished: true,
      })
    ).toBe(true);
  });

  it('publishes new studio episodes when the linked story is published', () => {
    expect(
      resolveEpisodePublishedForLibrarySync({
        libraryEpisodeIsPublished: undefined,
        autoPublish: false,
        linkedStoryIsPublished: true,
      })
    ).toBe(true);
  });

  it('uses autoPublish for new episodes when the story is unpublished', () => {
    expect(
      resolveEpisodePublishedForLibrarySync({
        libraryEpisodeIsPublished: undefined,
        autoPublish: false,
        linkedStoryIsPublished: false,
      })
    ).toBe(false);
    expect(
      resolveEpisodePublishedForLibrarySync({
        libraryEpisodeIsPublished: undefined,
        autoPublish: true,
        linkedStoryIsPublished: false,
      })
    ).toBe(true);
  });
});
