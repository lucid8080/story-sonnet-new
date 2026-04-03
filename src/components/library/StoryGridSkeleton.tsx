export default function StoryGridSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-3 pb-16 pt-8 sm:px-4 lg:px-4">
      <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-slate-200/80" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200/80" />
        <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-200/80" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-100"
          >
            <div className="aspect-[3/4] animate-pulse bg-slate-200/70" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200/80" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200/60" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200/60" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
