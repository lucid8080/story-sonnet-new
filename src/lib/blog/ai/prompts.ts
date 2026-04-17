import {
  blogGenerateFromKeywordsSchema,
  blogGenerateFromScratchSchema,
  blogGenerateRewriteSchema,
} from '@/lib/validation/blogSchemas';
import type { z } from 'zod';
type Scratch = z.infer<typeof blogGenerateFromScratchSchema>;
type Keywords = z.infer<typeof blogGenerateFromKeywordsSchema>;
type Rewrite = z.infer<typeof blogGenerateRewriteSchema>;

const JSON_SHAPE = `Return a single JSON object with ONLY these keys (valid JSON, no markdown fences):
${JSON.stringify(
  {
    titleSuggestions: ['string'],
    title: 'string',
    excerpt: 'string',
    contentHtml:
      'string — semantic HTML body: break ideas into many <p> paragraphs (avoid one giant <p>), use <h2>/<h3> for section headings, lists with <ul>/<ol> where helpful; allowed: p, h2, h3, ul, ol, li, blockquote, strong, em, a[href]',
    seoTitle: 'string',
    seoDescription: 'string',
    suggestedTags: ['string'],
    suggestedCategoryName: 'string or empty',
    imagePrompt: 'string — short art direction for a wide 16:9 blog hero image, no text in image',
    faqHtml: 'optional string — section of FAQ details',
  },
  null,
  2
)}`;

export function buildBlogScratchMessages(input: Scratch) {
  const lines = [
    'You are an expert editorial writer for a family-friendly audio story app (Story Sonnet).',
    'Write a helpful, warm blog post. No clickbait. Factually grounded tone.',
    `Topic: ${input.topic}`,
    input.audience ? `Audience: ${input.audience}` : '',
    input.tone ? `Tone: ${input.tone}` : '',
    input.length ? `Length: ${input.length} (short ~400-700 words, medium ~800-1200, long ~1300-2000)` : '',
    input.categoryHint ? `Category hint: ${input.categoryHint}` : '',
    input.cta ? `Optional CTA to weave in: ${input.cta}` : '',
    input.seoIntent ? `SEO intent: ${input.seoIntent}` : '',
    input.imageStylePrompt ? `Image style notes: ${input.imageStylePrompt}` : '',
    JSON_SHAPE,
  ].filter(Boolean);

  return [{ role: 'user' as const, content: lines.join('\n') }];
}

export function buildBlogKeywordsMessages(input: Keywords) {
  const lines = [
    'You are an SEO-aware editorial writer for Story Sonnet (family-friendly kids audio stories).',
    'Primary keywords must appear naturally; avoid stuffing.',
    `Primary keywords: ${input.primaryKeywords}`,
    input.secondaryKeywords
      ? `Secondary keywords: ${input.secondaryKeywords}`
      : '',
    input.audience ? `Audience: ${input.audience}` : '',
    input.tone ? `Tone: ${input.tone}` : '',
    input.length ? `Length: ${input.length}` : '',
    input.siteContext ? `Site context: ${input.siteContext}` : '',
    input.imageStyle ? `Image style: ${input.imageStyle}` : '',
    JSON_SHAPE,
  ].filter(Boolean);

  return [{ role: 'user' as const, content: lines.join('\n') }];
}

export function buildBlogRewriteMessages(input: Rewrite) {
  const goalHints: Record<Rewrite['goal'], string> = {
    seo: 'Improve headings, internal logic, and keyword placement without sounding robotic.',
    simplify: 'Shorten sentences and clarify for busy parents.',
    warmer: 'More conversational and reassuring.',
    professional: 'Polished and editorial, still approachable.',
    shorter: 'Reduce length by ~25% while keeping structure.',
    expand: 'Add one short illustrative example per major section where natural.',
  };

  return [
    {
      role: 'user' as const,
      content: [
        'Rewrite the following blog HTML for Story Sonnet.',
        `Goal: ${goalHints[input.goal]}`,
        input.extraInstructions ?? '',
        'Return JSON only with keys: title (optional), excerpt (optional), contentHtml (required), seoTitle (optional), seoDescription (optional).',
        'contentHtml must use multiple <p> paragraphs and <h2>/<h3> sections — never a single huge <p> for the whole article.',
        'contentHtml must use semantic tags: p, h2, h3, ul, ol, blockquote, strong, em, a.',
        '---',
        input.contentHtml,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];
}

export function buildTopicIdeasMessages(keyword: string) {
  return [
    {
      role: 'user' as const,
      content: `Given the content keyword "${keyword}", propose 8 distinct blog topic titles for Story Sonnet (kids audio stories / parenting listening).
Return JSON only: { "topics": [ { "title", "angle", "searchIntent", "audienceFit", "recommendedCategory", "seoDirection" } ] }`,
    },
  ];
}

export function buildSingleTopicFromKeywordMessage(keyword: string) {
  return [
    {
      role: 'user' as const,
      content: `Keyword: "${keyword}". Return JSON one object: { "title", "angle", "searchIntent", "audienceFit", "recommendedCategory", "seoDirection" } for a Story Sonnet blog post.`,
    },
  ];
}

export function buildDraftFromKeywordMessages(keyword: string, extras?: string) {
  return [
    {
      role: 'user' as const,
      content: [
        'Write a full blog draft for Story Sonnet from this keyword.',
        `Keyword: ${keyword}`,
        extras ?? '',
        JSON_SHAPE,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];
}
