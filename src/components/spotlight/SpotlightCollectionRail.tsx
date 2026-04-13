import Image from 'next/image';
import Link from 'next/link';
import type { SpotlightRailDTO } from '@/lib/content-spotlight/types';

export function SpotlightCollectionRail({ rail }: { rail: SpotlightRailDTO }) {
  if (!rail.stories.length) return null;
  return (
    <section className="mb-10">
      <div className="mb-3">
        <h2 className="text-xl font-black text-slate-900">{rail.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{rail.shortBlurb}</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
        {rail.stories.map((s) => (
          <Link
            key={s.storyId}
            href={`/story/${s.slug}`}
            className="group w-36 shrink-0"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-200 shadow-md ring-1 ring-slate-100 transition group-hover:shadow-lg">
              {s.coverUrl ? (
                <Image
                  src={s.coverUrl}
                  alt=""
                  fill
                  sizes="144px"
                  className="object-cover object-top transition duration-300 group-hover:scale-105"
                />
              ) : null}
              {s.isFeatured ? (
                <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-amber-950">
                  Featured
                </span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-slate-900 group-hover:text-teal-700">
              {s.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
