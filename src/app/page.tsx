import { BookAudio } from 'lucide-react';
import { homeRotatingStoryFromApp } from '@/lib/homeRotatingStory';
import { HomeStoryRotatingGrid } from '@/components/home/HomeStoryRotatingGrid';
import { sortAppStoriesForLibraryGrid } from '@/utils/libraryGridSort';
import {
  getCachedCatalogSpotlightBadges,
  getCachedHomepageSpotlightRails,
  getCachedPublicStories,
  STORY_PAGE_REVALIDATE_SEC,
} from '@/lib/storyPageCache';
import { SpotlightCollectionRail } from '@/components/spotlight/SpotlightCollectionRail';
import { HomepageCampaignHeroClient } from '@/components/campaigns/HomepageCampaignHeroClient';

export const revalidate = STORY_PAGE_REVALIDATE_SEC;

export default async function HomePage() {
  const sorted = sortAppStoriesForLibraryGrid(
    await getCachedPublicStories(),
    'newest'
  );
  const [badgeRecord, rails] = await Promise.all([
    getCachedCatalogSpotlightBadges(),
    getCachedHomepageSpotlightRails(),
  ]);
  const pool = sorted.map((s) => ({
    ...homeRotatingStoryFromApp(s),
    spotlightBadge: badgeRecord[s.slug] ?? null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-3 pb-16 pt-8 sm:px-4 lg:px-4">
      <HomepageCampaignHeroClient />
      <div className="mb-8 grid gap-8 lg:grid-cols-1 lg:items-center">
        <div>
          <div className="mb-4 hidden items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-rose-500 shadow-sm ring-1 ring-rose-100 sm:inline-flex">
            <BookAudio className="h-4 w-4" /> New stories. New episodes.
            Every day.
          </div>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
            Tiny adventures, big imagination.
          </h1>
          <p className="mt-5 hidden max-w-2xl text-lg leading-8 text-slate-600 sm:block">
            Browse stories by cover tile, open a story page, and listen through
            its episodes. Each story includes an age group so filtering can be
            added cleanly later.
          </p>
        </div>
      </div>

      {rails.map((rail) => (
        <SpotlightCollectionRail key={rail.spotlightId} rail={rail} />
      ))}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Story Library</h2>
          <p className="text-slate-500">
            Click a tile to open the story and start listening.
          </p>
        </div>
      </div>

      <HomeStoryRotatingGrid pool={pool} />
    </main>
  );
}
