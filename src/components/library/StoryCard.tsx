import Link from 'next/link';
import Image from 'next/image';
import { Clock3, Sparkles, Star } from 'lucide-react';
import type { BrowseStory } from '@/types/story';
import type { StorySpotlightBadgeDTO } from '@/lib/content-spotlight/types';
import { AGE_FILTER_OPTIONS } from '@/constants/storyFilters';
import { StoryCoverWithSpotlight } from '@/components/spotlight/StoryCoverWithSpotlight';

function ageLabel(ageRange: BrowseStory['ageRange']): string {
  return AGE_FILTER_OPTIONS.find((o) => o.id === ageRange)?.label ?? ageRange;
}

type Props = {
  story: BrowseStory;
  spotlightBadge?: StorySpotlightBadgeDTO | null;
};

export default function StoryCard({ story, spotlightBadge = null }: Props) {
  return (
    <Link
      href={`/story/${story.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/70 ring-1 ring-slate-100 transition duration-300 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
    >
      <StoryCoverWithSpotlight spotlight={spotlightBadge}>
        <div
          className="relative h-full w-full"
          style={{ backgroundColor: '#e2e8f0' }}
        >
          {story.coverImage ? (
            <Image
              src={story.coverImage}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover object-top transition duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>
      </StoryCoverWithSpotlight>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-black leading-snug text-slate-900 group-hover:text-rose-600">
          {story.title}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-600">
          {story.shortDescription}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          {story.isFeatured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-1 font-bold text-amber-950 shadow-sm">
              <Star className="h-3.5 w-3.5" aria-hidden />
              Featured
            </span>
          ) : null}
          {story.isPremium ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/95 px-2 py-1 font-bold text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Premium
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
            {ageLabel(story.ageRange)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {story.durationMinutes} min
          </span>
          {story.isSeries ? (
            <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-800">
              Series
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
              One-off
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
