'use client';

import type { AppStory } from '@/lib/stories';
import { AGE_FILTER_OPTIONS } from '@/constants/storyFilters';

function ageLabel(ageRange: string | null | undefined): string | null {
  if (!ageRange) return null;
  return AGE_FILTER_OPTIONS.find((o) => o.id === ageRange)?.label ?? ageRange;
}

export default function StoryStatusBadges({
  story,
  compact,
}: {
  story: Pick<
    AppStory,
    | 'isPublished'
    | 'isPremium'
    | 'isFeatured'
    | 'isSeries'
    | 'ageRange'
  >;
  compact?: boolean;
}) {
  const age = ageLabel(story.ageRange);
  const wrap = compact
    ? 'flex flex-wrap gap-1'
    : 'flex flex-wrap gap-1.5';
  return (
    <div className={wrap}>
      <span
        className={
          story.isPublished
            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800'
            : 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900'
        }
      >
        {story.isPublished ? 'Published' : 'Draft'}
      </span>
      {story.isPremium ? (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
          Premium
        </span>
      ) : null}
      {story.isFeatured ? (
        <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-bold text-amber-950">
          Featured
        </span>
      ) : null}
      <span
        className={
          story.isSeries
            ? 'rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800'
            : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600'
        }
      >
        {story.isSeries ? 'Series' : 'Standalone'}
      </span>
      {age ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
          {age}
        </span>
      ) : null}
    </div>
  );
}
