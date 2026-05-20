import { describe, expect, it } from 'vitest';
import {
  embeddedStorySlugsInHtml,
  suggestStoryEmbedsForPost,
  type StoryRowForSuggest,
} from '@/lib/blog/suggest-story-embeds';

const baseStory = (
  overrides: Partial<StoryRowForSuggest> & { slug: string; seriesTitle: string }
): StoryRowForSuggest => ({
  summary: null,
  fullDescription: null,
  seriesTagline: null,
  genre: null,
  mood: null,
  coverUrl: '/covers/test.jpg',
  popularityScore: 10,
  isFeatured: false,
  topics: null,
  characterTags: null,
  episodes: [
    {
      episodeNumber: 1,
      isPublished: true,
      isFreePreview: true,
    },
  ],
  ...overrides,
});

describe('suggestStoryEmbedsForPost', () => {
  it('ranks stories matching post keywords', () => {
    const stories = [
      baseStory({ slug: 'dragon-tales', seriesTitle: 'Dragon Tales', genre: 'Adventure' }),
      baseStory({ slug: 'ocean-songs', seriesTitle: 'Ocean Songs', genre: 'Calm' }),
    ];

    const results = suggestStoryEmbedsForPost(stories, {
      title: 'Best dragon stories for kids',
      excerpt: '',
      contentHtml: '<p>Dragons and adventure await.</p>',
      tagNames: [],
      metaKeywords: null,
      limit: 3,
    });

    expect(results[0]?.slug).toBe('dragon-tales');
  });

  it('skips slugs already embedded in HTML', () => {
    const stories = [
      baseStory({ slug: 'already-in', seriesTitle: 'Already In' }),
      baseStory({ slug: 'new-one', seriesTitle: 'New One' }),
    ];

    const results = suggestStoryEmbedsForPost(stories, {
      title: 'already in and new one',
      excerpt: '',
      contentHtml:
        '<div class="story-embed" data-story-slug="already-in"></div>',
      tagNames: [],
      metaKeywords: null,
    });

    expect(results.some((r) => r.slug === 'already-in')).toBe(false);
  });
});

describe('embeddedStorySlugsInHtml', () => {
  it('parses data-story-slug attributes', () => {
    const slugs = embeddedStorySlugsInHtml(
      '<div data-story-slug="foo"></div><div data-story-slug="bar"></div>'
    );
    expect([...slugs]).toEqual(['foo', 'bar']);
  });
});
