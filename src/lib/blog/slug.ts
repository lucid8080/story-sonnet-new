import { normalizeStorySlug, isValidStorySlug, STORY_SLUG_REGEX } from '@/lib/slug';

export { STORY_SLUG_REGEX };

export function slugifyBlogTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'post';
}

export function normalizeBlogSlug(raw: string): string {
  return normalizeStorySlug(raw);
}

export function isValidBlogSlug(s: string): boolean {
  return isValidStorySlug(s);
}
