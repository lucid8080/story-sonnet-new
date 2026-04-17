import type { BlogKeywordStatus, BlogPostStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isBlogPostPubliclyVisible } from '@/lib/blog/visibility';

function keywordStatusForPost(
  postStatus: BlogPostStatus,
  post: { publishedAt: Date | null; scheduledAt: Date | null },
  keyword: { assignedTopicTitle: string | null },
  now: Date
): BlogKeywordStatus {
  if (postStatus === 'ARCHIVED') {
    return keyword.assignedTopicTitle?.trim()
      ? 'TOPIC_CREATED'
      : 'UNUSED';
  }
  if (postStatus === 'DRAFT') {
    return 'DRAFT_CREATED';
  }
  const visible = isBlogPostPubliclyVisible(
    { status: postStatus, publishedAt: post.publishedAt, scheduledAt: post.scheduledAt },
    now
  );
  if (visible) {
    return 'PUBLISHED';
  }
  return 'DRAFT_CREATED';
}

/**
 * After blog post write: sync linked keyword row status and timestamps.
 */
export async function syncKeywordAfterPostSave(postId: string): Promise<void> {
  const now = new Date();
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    include: { linkedKeyword: true },
  });
  if (!post?.linkedKeyword) return;

  const nextStatus = keywordStatusForPost(
    post.status,
    post,
    post.linkedKeyword,
    now
  );
  const updates: {
    status: BlogKeywordStatus;
    completedAt?: Date | null;
    lastGeneratedAt?: Date;
  } = {
    status: nextStatus,
  };

  if (nextStatus === 'PUBLISHED') {
    updates.completedAt = post.linkedKeyword.completedAt ?? now;
  } else {
    updates.completedAt = null;
  }

  await prisma.blogKeyword.update({
    where: { id: post.linkedKeyword.id },
    data: updates,
  });
}

/**
 * When unlinking or deleting a post, fix keyword row.
 */
export async function releaseKeywordFromDeletedOrUnlinkedPost(
  keywordId: string,
  opts: { hadTopicTitle: boolean }
): Promise<void> {
  await prisma.blogKeyword.update({
    where: { id: keywordId },
    data: {
      assignedBlogPostId: null,
      status: opts.hadTopicTitle ? 'TOPIC_CREATED' : 'UNUSED',
      completedAt: null,
    },
  });
}
