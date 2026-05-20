import { plainTextFromHtml } from '@/lib/blog/reading-time';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'day',
  'get',
  'has',
  'him',
  'his',
  'how',
  'its',
  'may',
  'new',
  'now',
  'old',
  'see',
  'two',
  'way',
  'who',
  'boy',
  'did',
  'she',
  'use',
  'her',
  'than',
  'them',
  'then',
  'this',
  'that',
  'with',
  'from',
  'your',
  'what',
  'when',
  'will',
  'into',
  'about',
  'story',
  'stories',
  'sonnet',
]);

export type StoryRowForSuggest = {
  slug: string;
  seriesTitle: string;
  summary: string | null;
  fullDescription: string | null;
  seriesTagline: string | null;
  genre: string | null;
  mood: string | null;
  coverUrl: string | null;
  popularityScore: number;
  isFeatured: boolean;
  topics: unknown;
  characterTags: unknown;
  episodes: {
    episodeNumber: number;
    isPublished: boolean;
    isFreePreview: boolean;
  }[];
};

export type StoryEmbedSuggestion = {
  slug: string;
  title: string;
  coverUrl: string | null;
  score: number;
  matchReason: string;
  suggestedPreviewEpisodeNumber: number | null;
  suggestedFullEpisodeNumber: number | null;
  hasFreePreview: boolean;
};

export type SuggestStoryEmbedsInput = {
  title: string;
  excerpt: string;
  contentHtml: string;
  tagNames: string[];
  metaKeywords: string | null;
  limit?: number;
};

function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/\b[a-z0-9][a-z0-9'-]{2,}\b/g) ?? [];
  return [...new Set(raw.filter((w) => !STOP_WORDS.has(w)))];
}

function jsonStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function embeddedStorySlugsInHtml(html: string): Set<string> {
  const slugs = new Set<string>();
  const re = /data-story-slug=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1]?.trim();
    if (slug) slugs.add(slug);
  }
  const carouselRe = /data-stories=["']([^"']+)["']/gi;
  while ((m = carouselRe.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(
        m[1]!.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      );
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item &&
            typeof item === 'object' &&
            typeof (item as { storySlug?: string }).storySlug === 'string'
          ) {
            slugs.add((item as { storySlug: string }).storySlug);
          }
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return slugs;
}

function publishedEpisodes(story: StoryRowForSuggest) {
  return story.episodes
    .filter((e) => e.isPublished)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

function episodeHints(story: StoryRowForSuggest) {
  const published = publishedEpisodes(story);
  const firstPreview =
    published.find((e) => e.isFreePreview) ?? published[0] ?? null;
  const firstFull = published[0] ?? null;
  return {
    suggestedPreviewEpisodeNumber: firstPreview?.episodeNumber ?? null,
    suggestedFullEpisodeNumber: firstFull?.episodeNumber ?? null,
    hasFreePreview: published.some((e) => e.isFreePreview),
  };
}

function scoreStory(
  story: StoryRowForSuggest,
  tokens: string[],
  postTextLower: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const haystack = [
    story.slug,
    story.seriesTitle,
    story.summary,
    story.fullDescription,
    story.seriesTagline,
    story.genre,
    story.mood,
    ...jsonStringList(story.topics),
    ...jsonStringList(story.characterTags),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const titleLower = story.seriesTitle.toLowerCase();

  if (postTextLower.includes(story.slug.toLowerCase())) {
    score += 12;
    reasons.push('Story slug mentioned in post');
  }

  for (const token of tokens) {
    if (titleLower.includes(token)) {
      score += 4;
      if (!reasons.some((r) => r.startsWith('Title'))) {
        reasons.push(`Title matches “${token}”`);
      }
    } else if (haystack.includes(token)) {
      score += 2;
    }
  }

  if (story.genre) {
    const g = story.genre.toLowerCase();
    if (postTextLower.includes(g)) {
      score += 3;
      reasons.push(`Genre: ${story.genre}`);
    }
  }

  if (story.mood) {
    const m = story.mood.toLowerCase();
    if (postTextLower.includes(m)) {
      score += 3;
      reasons.push(`Mood: ${story.mood}`);
    }
  }

  for (const topic of jsonStringList(story.topics)) {
    if (postTextLower.includes(topic.toLowerCase())) {
      score += 2;
      reasons.push(`Topic: ${topic}`);
    }
  }

  if (story.isFeatured) score += 1;
  score += Math.min(5, (story.popularityScore ?? 0) / 20);

  return { score, reasons: [...new Set(reasons)].slice(0, 3) };
}

export function suggestStoryEmbedsForPost(
  stories: StoryRowForSuggest[],
  input: SuggestStoryEmbedsInput
): StoryEmbedSuggestion[] {
  const limit = Math.min(12, Math.max(1, input.limit ?? 6));
  const corpus = [
    input.title,
    input.excerpt,
    input.metaKeywords ?? '',
    input.tagNames.join(' '),
    plainTextFromHtml(input.contentHtml),
  ]
    .filter(Boolean)
    .join(' ');

  const tokens = tokenize(corpus);
  const postTextLower = corpus.toLowerCase();
  const alreadyEmbedded = embeddedStorySlugsInHtml(input.contentHtml);

  const ranked = stories
    .filter((s) => !alreadyEmbedded.has(s.slug))
    .map((story) => {
      const { score, reasons } = scoreStory(story, tokens, postTextLower);
      const hints = episodeHints(story);
      const coverUrl = story.coverUrl
        ? (resolvePublicAssetUrl(story.coverUrl) ?? story.coverUrl)
        : null;

      let matchReason = reasons.join(' · ');
      if (!matchReason) {
        if (story.isFeatured) matchReason = 'Featured on Story Sonnet';
        else matchReason = 'Popular series';
      }

      return {
        slug: story.slug,
        title: story.seriesTitle,
        coverUrl,
        score,
        matchReason,
        ...hints,
      };
    })
    .filter((s) => s.score > 0 || s.coverUrl)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.title.localeCompare(b.title);
    });

  const withScore = ranked.filter((s) => s.score > 0);
  const pool = withScore.length > 0 ? withScore : ranked;

  return pool.slice(0, limit);
}

export function storyEmbedAttrsFromSuggestion(
  suggestion: StoryEmbedSuggestion,
  options: {
    showCover: boolean;
    audioMode: 'none' | 'preview';
  }
): StoryEmbedAttrs {
  let audioMode: StoryEmbedAttrs['audioMode'] = 'none';
  let episodeNumber: number | null = null;

  if (options.audioMode === 'preview' && suggestion.hasFreePreview) {
    audioMode = 'preview';
    episodeNumber = suggestion.suggestedPreviewEpisodeNumber;
  }

  return {
    storySlug: suggestion.slug,
    storyTitle: suggestion.title,
    coverUrl: suggestion.coverUrl ?? '',
    showCover: options.showCover,
    audioMode,
    episodeNumber,
  };
}
