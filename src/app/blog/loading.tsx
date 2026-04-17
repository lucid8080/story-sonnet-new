export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-7">
      <div className="mx-auto h-10 max-w-md animate-pulse rounded-xl bg-neutral-200" />
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
          >
            <div className="aspect-[16/9] animate-pulse bg-neutral-200" />
            <div className="space-y-2 p-5">
              <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
              <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
