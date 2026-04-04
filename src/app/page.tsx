import Link from 'next/link';
import Image from 'next/image';
import { BookAudio, Clock3 } from 'lucide-react';
import { fetchStories } from '@/lib/stories';

export default async function HomePage() {
  const stories = await fetchStories();

  return (
    <main className="mx-auto max-w-6xl px-3 pb-16 pt-8 sm:px-4 lg:px-4">
      <div className="mb-8 grid gap-8 lg:grid-cols-1 lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-rose-500 shadow-sm ring-1 ring-rose-100">
            <BookAudio className="h-4 w-4" /> Organized for easy story
            browsing and listening
          </div>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
            Tiny adventures, big imagination.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Browse stories by cover tile, open a story page, and listen through
            its episodes. Each story includes an age group so filtering can be
            added cleanly later.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Story Library</h2>
          <p className="text-slate-500">
            Click a tile to open the story and start listening.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stories.map((story) => (
          <Link
            key={story.slug}
            href={`/story/${story.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/70 ring-1 ring-slate-100 transition duration-300 hover:shadow-2xl"
          >
            <div
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl"
              style={{ backgroundColor: story.accent || '#cbd5e1' }}
            >
              {story.cover && (
                <Image
                  src={story.cover}
                  alt={`${story.title} cover art`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-top transition duration-500 group-hover:scale-105"
                />
              )}
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-1 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700 opacity-0 shadow-sm ring-1 ring-slate-100 backdrop-blur transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {story.episodes.length}{' '}
                  {story.episodes.length === 1 ? 'episode' : 'episodes'}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
