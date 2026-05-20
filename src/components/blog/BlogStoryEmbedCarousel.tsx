'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';
import { StoryEmbedCoverTile } from '@/components/blog/StoryEmbedCoverTile';

/** Visible slides: 2 on mobile, 3 on md+. */
export function BlogStoryEmbedCarousel({
  stories,
}: {
  stories: StoryEmbedAttrs[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>('[data-embed-slide]');
    const gap = 12;
    const step = slide ? slide.offsetWidth + gap : el.clientWidth * 0.5;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    return () => ro.disconnect();
  }, [stories.length, updateArrows]);

  if (stories.length === 0) return null;

  const showNav = stories.length > 1;

  return (
    <div className="story-embed-carousel-root not-prose relative my-6 w-full">
      {showNav && canPrev ? (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-neutral-200/80 bg-white/90 p-1.5 shadow-md hover:bg-white md:left-0 md:-translate-x-1/2 md:p-2"
          aria-label="Previous stories"
        >
          <ChevronLeft className="h-4 w-4 text-neutral-800 md:h-5 md:w-5" />
        </button>
      ) : null}
      {showNav && canNext ? (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-neutral-200/80 bg-white/90 p-1.5 shadow-md hover:bg-white md:right-0 md:translate-x-1/2 md:p-2"
          aria-label="Next stories"
        >
          <ChevronRight className="h-4 w-4 text-neutral-800 md:h-5 md:w-5" />
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        onScroll={updateArrows}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {stories.map((embed) => (
          <div
            key={embed.storySlug}
            data-embed-slide
            className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start md:w-[calc((100%-1.5rem)/3)]"
          >
            <StoryEmbedCoverTile embed={embed} />
          </div>
        ))}
      </div>
    </div>
  );
}
