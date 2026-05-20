import { Node, mergeAttributes } from '@tiptap/core';
import type { ParsedVideo, VideoProvider } from '@/lib/blog/video-embed';

function iframeSrc(provider: VideoProvider, id: string): string {
  if (provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  }
  return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (video: ParsedVideo) => ReturnType;
    };
  }
}

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      provider: {
        default: 'youtube' as VideoProvider,
        parseHTML: (el) =>
          (el.getAttribute('data-video-provider') as VideoProvider) ?? 'youtube',
        renderHTML: (attrs) =>
          attrs.provider
            ? { 'data-video-provider': String(attrs.provider) }
            : {},
      },
      id: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-video-id') ?? '',
        renderHTML: (attrs) =>
          attrs.id ? { 'data-video-id': String(attrs.id) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[class*="video-embed"]' }];
  },

  renderHTML({ node }) {
    const provider = node.attrs.provider as VideoProvider;
    const id = String(node.attrs.id ?? '');
    const title = provider === 'youtube' ? 'YouTube video' : 'Vimeo video';
    return [
      'div',
      mergeAttributes({
        class:
          'video-embed not-prose relative my-8 aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900 shadow-sm',
        'data-video-provider': provider,
        'data-video-id': id,
      }),
      [
        'iframe',
        {
          class: 'absolute inset-0 h-full w-full border-0',
          src: iframeSrc(provider, id),
          title,
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
          allowfullscreen: 'true',
          loading: 'lazy',
          referrerpolicy: 'strict-origin-when-cross-origin',
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (video) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { provider: video.provider, id: video.id },
          }),
    };
  },
});
