import type {
  StoryEmbedAttrs,
  StoryEmbedAudioMode,
} from '@/components/admin/blog/storyEmbedExtension';

export function parseAudioModeFromDom(s: string | null): StoryEmbedAudioMode {
  if (
    s === 'preview' ||
    s === 'full' ||
    s === 'episode' ||
    s === 'none'
  ) {
    return s;
  }
  return 'none';
}

export function parseStoryEmbedElement(el: HTMLElement): StoryEmbedAttrs | null {
  const slug = el.getAttribute('data-story-slug')?.trim();
  if (!slug) return null;

  const epRaw = el.getAttribute('data-episode-number');
  const episodeNumber =
    epRaw != null && epRaw !== '' ? Number(epRaw) : null;

  return {
    storySlug: slug,
    storyTitle: el.getAttribute('data-story-title') ?? '',
    coverUrl: el.getAttribute('data-cover-url') ?? '',
    showCover: el.getAttribute('data-show-cover') !== 'false',
    audioMode: parseAudioModeFromDom(el.getAttribute('data-audio-mode')),
    episodeNumber:
      episodeNumber != null && Number.isFinite(episodeNumber)
        ? episodeNumber
        : null,
  };
}

export function hasStoryEmbedAudio(attrs: StoryEmbedAttrs): boolean {
  return (
    attrs.audioMode !== 'none' &&
    attrs.episodeNumber != null &&
    Number.isFinite(attrs.episodeNumber)
  );
}
