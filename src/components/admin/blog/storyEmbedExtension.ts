import { Node, mergeAttributes } from '@tiptap/core';

export type StoryEmbedAudioMode = 'none' | 'preview' | 'full' | 'episode';

export type StoryEmbedAttrs = {
  storySlug: string;
  storyTitle: string;
  coverUrl: string;
  showCover: boolean;
  audioMode: StoryEmbedAudioMode;
  /** Required when audio is not none; resolved at insert time for preview/full. */
  episodeNumber: number | null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    storyEmbed: {
      setStoryEmbed: (attrs: StoryEmbedAttrs) => ReturnType;
    };
  }
}

function parseBool(s: string | undefined, fallback: boolean): boolean {
  if (s === 'true') return true;
  if (s === 'false') return false;
  return fallback;
}

function parseAudioMode(s: string | undefined): StoryEmbedAudioMode {
  if (s === 'preview' || s === 'full' || s === 'episode' || s === 'none') {
    return s;
  }
  return 'none';
}

export const StoryEmbed = Node.create({
  name: 'storyEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      storySlug: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-story-slug') ?? '',
        renderHTML: (attrs) =>
          attrs.storySlug ? { 'data-story-slug': attrs.storySlug } : {},
      },
      storyTitle: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-story-title') ?? '',
        renderHTML: (attrs) =>
          attrs.storyTitle != null && String(attrs.storyTitle).length > 0
            ? { 'data-story-title': String(attrs.storyTitle) }
            : {},
      },
      coverUrl: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-cover-url') ?? '',
        renderHTML: (attrs) =>
          attrs.coverUrl ? { 'data-cover-url': String(attrs.coverUrl) } : {},
      },
      showCover: {
        default: true,
        parseHTML: (el) =>
          parseBool(el.getAttribute('data-show-cover') ?? undefined, true),
        renderHTML: (attrs) => ({
          'data-show-cover': attrs.showCover ? 'true' : 'false',
        }),
      },
      audioMode: {
        default: 'none' as StoryEmbedAudioMode,
        parseHTML: (el) =>
          parseAudioMode(el.getAttribute('data-audio-mode') ?? undefined),
        renderHTML: (attrs) => ({
          'data-audio-mode': attrs.audioMode ?? 'none',
        }),
      },
      episodeNumber: {
        default: null as number | null,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-episode-number');
          if (raw == null || raw === '') return null;
          const n = Number(raw);
          return Number.isFinite(n) ? n : null;
        },
        renderHTML: (attrs) => {
          const n = attrs.episodeNumber;
          if (n == null || !Number.isFinite(n)) return {};
          return { 'data-episode-number': String(n) };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div.story-embed' },
      { tag: 'div[data-story-embed]' },
    ];
  },

  renderHTML({ node }) {
    const a = node.attrs as StoryEmbedAttrs;
    return [
      'div',
      mergeAttributes({
        class: 'story-embed',
        'data-story-embed': '1',
        'data-story-slug': a.storySlug,
        ...(a.storyTitle ? { 'data-story-title': a.storyTitle } : {}),
        ...(a.coverUrl ? { 'data-cover-url': a.coverUrl } : {}),
        'data-show-cover': a.showCover ? 'true' : 'false',
        'data-audio-mode': a.audioMode ?? 'none',
        ...(a.episodeNumber != null && Number.isFinite(a.episodeNumber)
          ? { 'data-episode-number': String(a.episodeNumber) }
          : {}),
      }),
    ];
  },

  addCommands() {
    return {
      setStoryEmbed:
        (attrs: StoryEmbedAttrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              storySlug: attrs.storySlug,
              storyTitle: attrs.storyTitle ?? '',
              coverUrl: attrs.coverUrl ?? '',
              showCover: attrs.showCover ?? true,
              audioMode: attrs.audioMode ?? 'none',
              episodeNumber: attrs.episodeNumber ?? null,
            },
          });
        },
    };
  },
});
