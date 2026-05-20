import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { StoryEmbedCarouselNodeView } from '@/components/admin/blog/StoryEmbedEditorPreview';
import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';
import { parseStoryEmbedElement } from '@/lib/blog/parse-story-embed-dom';

function parseStoriesJson(raw: string | null): StoryEmbedAttrs[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoryEmbedAttrs =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as StoryEmbedAttrs).storySlug === 'string'
    );
  } catch {
    return [];
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    storyEmbedCarousel: {
      insertStoryEmbedCarousel: (attrsList: StoryEmbedAttrs[]) => ReturnType;
    };
  }
}

export const StoryEmbedCarousel = Node.create({
  name: 'storyEmbedCarousel',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      stories: {
        default: [] as StoryEmbedAttrs[],
        parseHTML: (el) => {
          const fromJson = parseStoriesJson(el.getAttribute('data-stories'));
          if (fromJson.length > 0) return fromJson;
          const fromChildren: StoryEmbedAttrs[] = [];
          el.querySelectorAll<HTMLElement>(':scope > .story-embed').forEach((child) => {
            const parsed = parseStoryEmbedElement(child);
            if (parsed) fromChildren.push(parsed);
          });
          return fromChildren;
        },
        renderHTML: (attrs) => {
          const stories = (attrs.stories ?? []) as StoryEmbedAttrs[];
          if (stories.length === 0) return {};
          return {
            'data-stories': JSON.stringify(stories),
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.story-embed-carousel' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const stories = (node.attrs.stories ?? []) as StoryEmbedAttrs[];
    const childDivs = stories.map((a) => [
      'div',
      {
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
      },
    ]);

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'story-embed-carousel',
        'data-story-embed-carousel': '1',
        ...(stories.length > 0
          ? { 'data-stories': JSON.stringify(stories) }
          : {}),
      }),
      ...childDivs,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StoryEmbedCarouselNodeView);
  },

  addCommands() {
    return {
      insertStoryEmbedCarousel:
        (attrsList: StoryEmbedAttrs[]) =>
        ({ commands }) => {
          if (attrsList.length === 0) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { stories: attrsList },
          });
        },
    };
  },
});
