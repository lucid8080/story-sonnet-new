'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BlogStoryEmbedsGroup } from '@/components/blog/BlogStoryEmbed';
import { parseStoryEmbedElement } from '@/lib/blog/parse-story-embed-dom';
import type { StoryEmbedAttrs } from '@/components/admin/blog/storyEmbedExtension';

function isStoryEmbedEl(el: Element): el is HTMLElement {
  return (
    el instanceof HTMLElement &&
    el.classList.contains('story-embed') &&
    el.hasAttribute('data-story-slug') &&
    !el.closest('.story-embed-carousel')
  );
}

function parseCarouselElement(carousel: HTMLElement): StoryEmbedAttrs[] {
  const json = carousel.getAttribute('data-stories');
  if (json) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is StoryEmbedAttrs =>
            item != null &&
            typeof item === 'object' &&
            typeof (item as StoryEmbedAttrs).storySlug === 'string'
        );
      }
    } catch {
      // fall through to child divs
    }
  }
  const items: StoryEmbedAttrs[] = [];
  carousel.querySelectorAll<HTMLElement>(':scope > .story-embed').forEach((child) => {
    const parsed = parseStoryEmbedElement(child);
    if (parsed) items.push(parsed);
  });
  return items;
}

/** Group consecutive top-level `.story-embed` blocks into carousel mounts. */
function hydrateStoryEmbeds(container: HTMLElement, roots: Root[]) {
  const nodes = Array.from(container.childNodes);

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (!(node instanceof HTMLElement)) {
      i += 1;
      continue;
    }

    if (node.classList.contains('story-embed-carousel')) {
      const stories = parseCarouselElement(node);
      node.innerHTML = '';
      node.className = 'story-embed-carousel-mount not-prose';
      const root = createRoot(node);
      root.render(<BlogStoryEmbedsGroup stories={stories} />);
      roots.push(root);
      i += 1;
      continue;
    }

    if (isStoryEmbedEl(node)) {
      const run: HTMLElement[] = [node];
      let j = i + 1;
      while (j < nodes.length) {
        const next = nodes[j];
        if (next instanceof HTMLElement && isStoryEmbedEl(next)) {
          run.push(next);
          j += 1;
        } else break;
      }

      const stories = run
        .map(parseStoryEmbedElement)
        .filter((s): s is StoryEmbedAttrs => s != null);

      const mount = document.createElement('div');
      mount.className = 'story-embed-group-mount';
      run[0]!.replaceWith(mount);
      for (let k = 1; k < run.length; k += 1) run[k]!.remove();

      const root = createRoot(mount);
      root.render(<BlogStoryEmbedsGroup stories={stories} />);
      roots.push(root);
      i = j;
      continue;
    }

    i += 1;
  }
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

    hydrateStoryEmbeds(container, rootsRef.current);

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
