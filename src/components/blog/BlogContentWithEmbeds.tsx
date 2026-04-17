'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BlogStoryEmbed } from '@/components/blog/BlogStoryEmbed';
import type { StoryEmbedAudioMode } from '@/components/admin/blog/storyEmbedExtension';

function parseAudioMode(s: string | null): StoryEmbedAudioMode {
  if (
    s === 'preview' ||
    s === 'full' ||
    s === 'episode' ||
    s === 'none'
  ) {
    return s;
  }
  return 'none';
}

export function BlogContentWithEmbeds({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Root[]>([]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    for (const r of rootsRef.current) {
      try {
        r.unmount();
      } catch {
        // ignore
      }
    }
    rootsRef.current = [];

    const embeds = container.querySelectorAll<HTMLElement>('.story-embed');
    embeds.forEach((node) => {
      const slug = node.getAttribute('data-story-slug');
      if (!slug) return;

      const epRaw = node.getAttribute('data-episode-number');
      const episodeNumber =
        epRaw != null && epRaw !== '' ? Number(epRaw) : null;

      const root = createRoot(node);
      root.render(
        <BlogStoryEmbed
          storySlug={slug}
          storyTitle={node.getAttribute('data-story-title') ?? ''}
          coverUrl={node.getAttribute('data-cover-url') ?? ''}
          showCover={node.getAttribute('data-show-cover') !== 'false'}
          audioMode={parseAudioMode(node.getAttribute('data-audio-mode'))}
          episodeNumber={
            episodeNumber != null && Number.isFinite(episodeNumber)
              ? episodeNumber
              : null
          }
        />
      );
      rootsRef.current.push(root);
    });

    return () => {
      for (const r of rootsRef.current) {
        try {
          r.unmount();
        } catch {
          // ignore
        }
      }
      rootsRef.current = [];
    };
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
