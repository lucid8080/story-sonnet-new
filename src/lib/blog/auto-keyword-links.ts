import { normalizeKeywordPhrase } from '@/lib/blog/keyword-normalize';
import { plainTextFromHtml } from '@/lib/blog/reading-time';

export type AutoLinkKind = 'blog' | 'story' | 'external';

export type AutoLinkTarget = {
  /** Phrase to match in body text (case-insensitive, word boundaries). */
  phrase: string;
  normalizedPhrase: string;
  href: string;
  kind: AutoLinkKind;
  label: string;
  score: number;
};

export type ApplyAutoKeywordLinksOptions = {
  currentPostSlug?: string;
  maxLinks?: number;
  maxPerPhrase?: number;
  includeBlog?: boolean;
  includeStories?: boolean;
  includeExternal?: boolean;
};

export type AppliedAutoLink = {
  phrase: string;
  href: string;
  kind: AutoLinkKind;
  label: string;
  count: number;
};

export type ApplyAutoKeywordLinksResult = {
  html: string;
  applied: AppliedAutoLink[];
};

const SKIP_TAG_NAMES = new Set([
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'script',
  'style',
  'iframe',
  'noscript',
  'code',
  'pre',
]);

const SKIP_EMBED_DIV_RE =
  /^<div\b[^>]*\bdata-(story-embed|story-embed-carousel|video-provider)=/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Word-boundary regex for a multi-word phrase. */
export function phraseMatchRegex(phrase: string): RegExp | null {
  const normalized = normalizeKeywordPhrase(phrase);
  if (!normalized || normalized.length < 3) return null;
  const parts = normalized.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    return new RegExp(`\\b(${parts[0]})\\b`, 'gi');
  }
  return new RegExp(`\\b(${parts.join('\\s+')})\\b`, 'gi');
}

function linkRel(kind: AutoLinkKind): string {
  return kind === 'external'
    ? 'noopener noreferrer nofollow'
    : 'noopener noreferrer';
}

function wrapWithAnchor(match: string, target: AutoLinkTarget): string {
  const rel = linkRel(target.kind);
  const cls = `auto-link auto-link--${target.kind}`;
  return `<a href="${escapeHtmlAttr(target.href)}" rel="${rel}" class="${cls}">${match}</a>`;
}

function tagNameFromMarkup(tag: string): { name: string; closing: boolean } | null {
  const close = /^<\s*\/\s*([a-z0-9]+)/i.exec(tag);
  if (close?.[1]) return { name: close[1].toLowerCase(), closing: true };
  const open = /^<\s*([a-z0-9]+)/i.exec(tag);
  if (open?.[1]) return { name: open[1].toLowerCase(), closing: false };
  return null;
}

function isSelfClosing(tag: string): boolean {
  return /\/\s*>$/.test(tag);
}

function shouldSkipContainer(tag: string): boolean {
  if (SKIP_EMBED_DIV_RE.test(tag)) return true;
  const parsed = tagNameFromMarkup(tag);
  return parsed ? SKIP_TAG_NAMES.has(parsed.name) : false;
}

/**
 * Inject internal/external keyword links into blog HTML.
 * Skips existing anchors, headings, embeds, and code blocks.
 */
export function applyAutoKeywordLinks(
  html: string,
  targets: AutoLinkTarget[],
  options: ApplyAutoKeywordLinksOptions = {}
): ApplyAutoKeywordLinksResult {
  const maxLinks = Math.min(30, Math.max(1, options.maxLinks ?? 12));
  const maxPerPhrase = Math.min(3, Math.max(1, options.maxPerPhrase ?? 1));

  const filtered = targets
    .filter((t) => {
      if (t.kind === 'blog' && options.includeBlog === false) return false;
      if (t.kind === 'story' && options.includeStories === false) return false;
      if (t.kind === 'external' && options.includeExternal === false) return false;
      if (
        t.kind === 'blog' &&
        options.currentPostSlug &&
        t.href === `/blog/${options.currentPostSlug}`
      ) {
        return false;
      }
      return phraseMatchRegex(t.phrase) !== null;
    })
    .sort((a, b) => {
      const len = b.normalizedPhrase.length - a.normalizedPhrase.length;
      if (len !== 0) return len;
      return b.score - a.score;
    });

  const appliedMap = new Map<string, AppliedAutoLink>();
  let totalLinked = 0;

  const parts = html.split(/(<[^>]+>)/g);
  const skipStack: string[] = [];

  const linkedCounts = new Map<string, number>();

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.startsWith('<')) {
      const parsed = tagNameFromMarkup(part);
      if (parsed && shouldSkipContainer(part)) {
        if (parsed.closing) {
          const top = skipStack[skipStack.length - 1];
          if (top === parsed.name) skipStack.pop();
        } else if (!isSelfClosing(part)) {
          skipStack.push(parsed.name);
        }
      }
      continue;
    }

    if (skipStack.length > 0 || !part.trim()) continue;
    if (totalLinked >= maxLinks) continue;

    let text = part;
    for (const target of filtered) {
      if (totalLinked >= maxLinks) break;
      const key = `${target.kind}:${target.href}:${target.normalizedPhrase}`;
      const used = linkedCounts.get(key) ?? 0;
      if (used >= maxPerPhrase) continue;

      const re = phraseMatchRegex(target.phrase);
      if (!re) continue;

      re.lastIndex = 0;
      const next = text.replace(re, (match) => {
        if (totalLinked >= maxLinks) return match;
        const current = linkedCounts.get(key) ?? 0;
        if (current >= maxPerPhrase) return match;
        linkedCounts.set(key, current + 1);
        totalLinked += 1;

        const entry = appliedMap.get(key) ?? {
          phrase: target.phrase,
          href: target.href,
          kind: target.kind,
          label: target.label,
          count: 0,
        };
        entry.count += 1;
        appliedMap.set(key, entry);

        return wrapWithAnchor(match, target);
      });

      if (next !== text) {
        text = next;
        // After linking, this segment may contain <a> — stop further targets in same chunk
        // to avoid nested links (longest phrases are processed first).
        break;
      }
    }

    parts[i] = text;
  }

  return {
    html: parts.join(''),
    applied: [...appliedMap.values()].sort((a, b) => b.count - a.count),
  };
}

export type BlogPostLinkSource = {
  slug: string;
  title: string;
  excerpt: string | null;
  metaKeywords: string | null;
};

export type StoryLinkSource = {
  slug: string;
  seriesTitle: string;
  summary: string | null;
  genre: string | null;
  popularityScore: number;
  isFeatured: boolean;
};

export type ExternalKeywordLinkRule = {
  id: string;
  phrase: string;
  href: string;
  label?: string;
  enabled?: boolean;
};

export function parseExternalKeywordLinkRules(
  raw: unknown
): ExternalKeywordLinkRule[] {
  if (!Array.isArray(raw)) return [];
  const out: ExternalKeywordLinkRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const phrase = typeof o.phrase === 'string' ? o.phrase.trim() : '';
    const href = typeof o.href === 'string' ? o.href.trim() : '';
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const enabled = o.enabled !== false;
    if (!id || !phrase || !href || !enabled) continue;
    if (!/^https?:\/\//i.test(href)) continue;
    if (phrase.length > 120 || href.length > 500) continue;
    out.push({
      id,
      phrase,
      href,
      label: label || phrase,
      enabled: true,
    });
  }
  return out;
}

export function targetsFromBlogPosts(
  posts: BlogPostLinkSource[],
  currentSlug?: string
): AutoLinkTarget[] {
  const out: AutoLinkTarget[] = [];
  for (const post of posts) {
    if (currentSlug && post.slug === currentSlug) continue;
    const normalized = normalizeKeywordPhrase(post.title);
    if (normalized.length < 4) continue;
    out.push({
      phrase: post.title.trim(),
      normalizedPhrase: normalized,
      href: `/blog/${post.slug}`,
      kind: 'blog',
      label: post.title.trim(),
      score: 8,
    });
    const slugPhrase = normalizeKeywordPhrase(post.slug.replace(/-/g, ' '));
    if (slugPhrase.length >= 4 && slugPhrase !== normalized) {
      out.push({
        phrase: post.slug.replace(/-/g, ' '),
        normalizedPhrase: slugPhrase,
        href: `/blog/${post.slug}`,
        kind: 'blog',
        label: post.title.trim(),
        score: 4,
      });
    }
  }
  return out;
}

export function targetsFromStories(stories: StoryLinkSource[]): AutoLinkTarget[] {
  return stories.map((story) => {
    const normalized = normalizeKeywordPhrase(story.seriesTitle);
    let score = 6;
    if (story.isFeatured) score += 2;
    score += Math.min(4, (story.popularityScore ?? 0) / 25);
    return {
      phrase: story.seriesTitle.trim(),
      normalizedPhrase: normalized,
      href: `/story/${story.slug}`,
      kind: 'story',
      label: story.seriesTitle.trim(),
      score,
    };
  });
}

export function targetsFromExternalRules(
  rules: ExternalKeywordLinkRule[]
): AutoLinkTarget[] {
  return rules.map((rule) => ({
    phrase: rule.phrase,
    normalizedPhrase: normalizeKeywordPhrase(rule.phrase),
    href: rule.href,
    kind: 'external' as const,
    label: rule.label ?? rule.phrase,
    score: 10,
  }));
}

/** Keep targets whose phrase appears in the post body (plain text). */
export function filterTargetsPresentInText(
  targets: AutoLinkTarget[],
  plainText: string
): AutoLinkTarget[] {
  const lower = plainText.toLowerCase();
  return targets.filter((t) => {
    if (t.normalizedPhrase.length < 3) return false;
    return lower.includes(t.normalizedPhrase);
  });
}

export function dedupeAutoLinkTargets(targets: AutoLinkTarget[]): AutoLinkTarget[] {
  const byPhrase = new Map<string, AutoLinkTarget>();
  for (const t of targets) {
    const key = t.normalizedPhrase;
    const prev = byPhrase.get(key);
    if (!prev || t.score > prev.score) {
      byPhrase.set(key, t);
    }
  }
  return [...byPhrase.values()];
}

export type RankAutoLinkContext = {
  title: string;
  excerpt: string;
  tagNames: string[];
  metaKeywords: string | null;
  contentHtml: string;
};

/** Boost scores when target phrases overlap post metadata tokens. */
export function rankAutoLinkTargets(
  targets: AutoLinkTarget[],
  context: RankAutoLinkContext
): AutoLinkTarget[] {
  const corpus = [
    context.title,
    context.excerpt,
    context.metaKeywords ?? '',
    context.tagNames.join(' '),
    plainTextFromHtml(context.contentHtml),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return targets
    .map((t) => {
      let score = t.score;
      if (corpus.includes(t.normalizedPhrase)) score += 6;
      const words = t.normalizedPhrase.split(/\s+/);
      for (const w of words) {
        if (w.length >= 4 && corpus.includes(w)) score += 1;
      }
      return { ...t, score };
    })
    .sort((a, b) => b.score - a.score);
}
