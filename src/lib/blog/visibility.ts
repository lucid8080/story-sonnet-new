import type { BlogPost, BlogPostStatus } from '@prisma/client';

export type BlogPostVisibilityFields = Pick<
  BlogPost,
  'status' | 'publishedAt' | 'scheduledAt'
>;

/**
 * Public blog visibility: published immediately, or scheduled with release time passed.
 * Drafts and archived posts are never public. Future-scheduled posts are hidden until time.
 */
export function isBlogPostPubliclyVisible(
  post: BlogPostVisibilityFields,
  now: Date
): boolean {
  if (post.status === 'ARCHIVED' || post.status === 'DRAFT') {
    return false;
  }
  if (post.status === 'PUBLISHED') {
    return true;
  }
  if (post.status === 'SCHEDULED') {
    if (!post.scheduledAt) return false;
    return post.scheduledAt.getTime() <= now.getTime();
  }
  return false;
}

export function publicBlogStatusesFilter(now: Date): {
  OR: Array<{
    status: BlogPostStatus;
    scheduledAt?: { lte: Date };
  }>;
} {
  return {
    OR: [
      { status: 'PUBLISHED' },
      {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
    ],
  };
}
