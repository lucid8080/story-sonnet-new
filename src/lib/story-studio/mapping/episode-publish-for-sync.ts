/**
 * Resolve Episode.isPublished when mapping a Story Studio draft → library upsert.
 * Linked library rows keep their flag; new studio-only rows inherit the live
 * story's published state (so Add Episode on a published series stays public).
 */
export function resolveEpisodePublishedForLibrarySync(opts: {
  libraryEpisodeIsPublished: boolean | undefined;
  autoPublish: boolean;
  linkedStoryIsPublished: boolean;
}): boolean {
  if (opts.libraryEpisodeIsPublished !== undefined) {
    return opts.libraryEpisodeIsPublished;
  }
  return opts.linkedStoryIsPublished || opts.autoPublish;
}
