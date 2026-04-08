import { fetchStoryBySlug } from '@/lib/stories';

const COMMENT_MAX = 2000;
const RATING_MIN = 1;
const RATING_MAX = 5;

export { COMMENT_MAX, RATING_MIN, RATING_MAX };

export async function requireKnownStorySlug(
  slug: string
): Promise<{ ok: true } | { ok: false; status: 404 }> {
  const story = await fetchStoryBySlug(slug);
  if (!story) return { ok: false, status: 404 };
  return { ok: true };
}

export function parseCommentBody(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Comment body must be a string.' };
  }
  const body = raw.trim();
  if (!body.length) {
    return { ok: false, error: 'Comment cannot be empty.' };
  }
  if (body.length > COMMENT_MAX) {
    return { ok: false, error: `Comment must be at most ${COMMENT_MAX} characters.` };
  }
  return { ok: true, body };
}

export function parseStoryRating(
  raw: unknown
): { ok: true; rating: number } | { ok: false; error: string } {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return { ok: false, error: 'Rating must be an integer.' };
  }
  if (raw < RATING_MIN || raw > RATING_MAX) {
    return {
      ok: false,
      error: `Rating must be between ${RATING_MIN} and ${RATING_MAX}.`,
    };
  }
  return { ok: true, rating: raw };
}

export function hasCommentModerationRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'moderator';
}
