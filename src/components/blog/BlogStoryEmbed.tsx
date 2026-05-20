'use client';

import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';
import { BlogStoryEmbedCarousel } from '@/components/blog/BlogStoryEmbedCarousel';

export function BlogStoryEmbedsGroup({ stories }: { stories: StoryEmbedAttrs[] }) {
  if (stories.length === 0) return null;
  const visible = stories.filter((s) => s.showCover || s.audioMode !== 'none');
  if (visible.length === 0) return null;
  return <BlogStoryEmbedCarousel stories={visible} />;
}
