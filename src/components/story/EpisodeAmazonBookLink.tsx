'use client';

import { BookOpen } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { getEpisodeAmazonBookHref } from '@/lib/amazonBookUrl';

type EpisodeAmazonBookLinkProps = {
  episode: {
    id: string;
    amazonBookUrl?: string | null;
  };
  /** Visual density for tracklist vs modal CTA. */
  variant?: 'icon' | 'cta';
  className?: string;
};

/**
 * Public Amazon book control. Href comes from `getEpisodeAmazonBookHref`
 * so we can later swap to `/api/books/click/[episodeId]` without redesigning UI.
 */
export function EpisodeAmazonBookLink({
  episode,
  variant = 'icon',
  className = '',
}: EpisodeAmazonBookLinkProps) {
  const href = getEpisodeAmazonBookHref(episode);
  if (!href) return null;

  const stopRow = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
  };

  if (variant === 'cta') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get this book on Amazon"
        title="Get the book on Amazon"
        onClick={stopRow}
        onKeyDown={stopRow}
        className={`inline-flex items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-slate-900 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${className}`}
      >
        <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
        <span>Get the Book on Amazon</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get this book on Amazon"
      title="Get the book on Amazon"
      onClick={stopRow}
      onKeyDown={stopRow}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${className}`}
    >
      <BookOpen className="h-4 w-4" aria-hidden />
    </a>
  );
}
