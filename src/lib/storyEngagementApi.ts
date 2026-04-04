import { fetchStoryBySlug } from '@/lib/stories';

const COMMENT_MAX = 2000;

export { COMMENT_MAX };

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
