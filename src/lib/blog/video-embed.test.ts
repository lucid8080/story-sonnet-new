import { describe, expect, it } from 'vitest';
import {
  embedVideoLinksInBlogHtml,
  parseVideoUrl,
  videoEmbedHtml,
} from '@/lib/blog/video-embed';
import { sanitizeBlogContentHtml } from '@/lib/blog/sanitize-html';

describe('parseVideoUrl', () => {
  it('parses youtube watch URLs', () => {
    expect(
      parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    ).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('parses youtu.be URLs', () => {
    expect(parseVideoUrl('https://youtu.be/abc123XYZ')).toEqual({
      provider: 'youtube',
      id: 'abc123XYZ',
    });
  });

  it('parses vimeo URLs', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789')).toEqual({
      provider: 'vimeo',
      id: '123456789',
    });
  });

  it('returns null for non-video URLs', () => {
    expect(parseVideoUrl('https://example.com/page')).toBeNull();
  });
});

describe('embedVideoLinksInBlogHtml', () => {
  it('replaces a paragraph with only a youtube link', () => {
    const html =
      '<p><a href="https://www.youtube.com/watch?v=abc123">https://www.youtube.com/watch?v=abc123</a></p>';
    const out = embedVideoLinksInBlogHtml(html);
    expect(out).toContain('video-embed');
    expect(out).toContain('youtube-nocookie.com/embed/abc123');
    expect(out).not.toContain('<a ');
  });

  it('replaces a plain youtube URL in a paragraph', () => {
    const html = '<p>https://www.youtube.com/watch?v=xyz789</p>';
    const out = embedVideoLinksInBlogHtml(html);
    expect(out).toContain('youtube-nocookie.com/embed/xyz789');
  });

  it('keeps non-video links', () => {
    const html = '<p><a href="https://example.com">Example</a></p>';
    expect(embedVideoLinksInBlogHtml(html)).toBe(html);
  });
});

describe('sanitizeBlogContentHtml with video', () => {
  it('allows iframe embeds after link conversion', () => {
    const html =
      '<p><a href="https://youtu.be/testid12">link</a></p>';
    const out = sanitizeBlogContentHtml(html);
    expect(out).toContain('<iframe');
    expect(out).toContain('youtube-nocookie.com/embed/testid12');
  });
});
