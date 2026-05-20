'use client';

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Play } from 'lucide-react';
import { useRef } from 'react';
import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';
import { hasStoryEmbedAudio } from '@/lib/blog/parse-story-embed-dom';

function attrsFromNodeProps(node: NodeViewProps['node']): StoryEmbedAttrs {
  const a = node.attrs as StoryEmbedAttrs;
  return {
    storySlug: a.storySlug ?? '',
    storyTitle: a.storyTitle ?? '',
    coverUrl: a.coverUrl ?? '',
    showCover: a.showCover !== false,
    audioMode: a.audioMode ?? 'none',
    episodeNumber: a.episodeNumber ?? null,
  };
}

export function StoryEmbedTilePreview({ embed }: { embed: StoryEmbedAttrs }) {
  const showCover = embed.showCover && Boolean(embed.coverUrl);
  const showAudio = hasStoryEmbedAudio(embed);

  if (!showCover) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs font-medium text-slate-500">
        {embed.storyTitle || embed.storySlug}
        {showAudio ? ' · audio' : ''}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl ring-1 ring-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={embed.coverUrl}
        alt=""
        className="aspect-[3/4] w-full object-cover object-top"
        draggable={false}
      />
      {showAudio ? (
        <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow">
          <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
        </span>
      ) : null}
    </div>
  );
}

export function StoryEmbedNodeView(props: NodeViewProps) {
  const embed = attrsFromNodeProps(props.node);

  return (
    <NodeViewWrapper
      as="div"
      className="story-embed-editor my-4 w-[calc((100%-0.5rem)/2)] md:w-[calc((100%-1rem)/3)]"
      data-drag-handle
    >
      <StoryEmbedTilePreview embed={embed} />
    </NodeViewWrapper>
  );
}

export function StoryEmbedCarouselNodeView(props: NodeViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stories = (props.node.attrs.stories ?? []) as StoryEmbedAttrs[];

  return (
    <NodeViewWrapper
      as="div"
      className="story-embed-carousel-editor my-4"
      data-drag-handle
    >
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
      >
        {stories.map((embed) => (
          <div
            key={embed.storySlug}
            className="w-[calc((100%-0.5rem)/2)] shrink-0 snap-start md:w-[calc((100%-1rem)/3)]"
          >
            <StoryEmbedTilePreview embed={embed} />
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-slate-400">Drag to reposition</p>
    </NodeViewWrapper>
  );
}
