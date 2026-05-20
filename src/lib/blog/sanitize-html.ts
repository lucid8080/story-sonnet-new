import sanitizeHtml from 'sanitize-html';
import { embedVideoLinksInBlogHtml } from '@/lib/blog/video-embed';

const storyEmbedDivAttributes = [
  'class',
  'data-story-embed',
  'data-story-slug',
  'data-story-title',
  'data-cover-url',
  'data-show-cover',
  'data-audio-mode',
  'data-episode-number',
  'data-story-embed-carousel',
  'data-stories',
] as const;

const videoEmbedDivAttributes = [
  'class',
  'data-video-provider',
  'data-video-id',
] as const;

const blogSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'figure',
    'figcaption',
    'span',
    'div',
    'iframe',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    div: [...storyEmbedDivAttributes, ...videoEmbedDivAttributes],
    iframe: [
      'src',
      'title',
      'allow',
      'allowfullscreen',
      'loading',
      'referrerpolicy',
      'class',
    ],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedIframeHostnames: [
    'www.youtube-nocookie.com',
    'www.youtube.com',
    'player.vimeo.com',
  ],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

export function sanitizeBlogContentHtml(html: string): string {
  const withEmbeds = embedVideoLinksInBlogHtml(html);
  return sanitizeHtml(withEmbeds, blogSanitizeOptions);
}
