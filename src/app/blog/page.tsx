import Link from 'next/link';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import {
  countPublicBlogPosts,
  getFeaturedPublicPost,
  listPublicBlogPosts,
} from '@/lib/blog/queries';
import prisma from '@/lib/prisma';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: `Blog | ${BRAND.productName}`,
  description: `Articles and tips from ${BRAND.productName}.`,
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const take = 12;
  const page = Math.max(1, Number(sp.page ?? '1'));
  const skip = (page - 1) * take;
  const sort =
    sp.sort === 'oldest' || sp.sort === 'featured' ? sp.sort : 'newest';

  const [featured, posts, total, categories] = await Promise.all([
    getFeaturedPublicPost(now),
    listPublicBlogPosts({
      now,
      take,
      skip,
      search: sp.q,
      categorySlug: sp.category,
      tagSlug: sp.tag,
      sort: sort as 'newest' | 'oldest' | 'featured',
    }),
    countPublicBlogPosts({
      now,
      search: sp.q,
      categorySlug: sp.category,
      tagSlug: sp.tag,
    }),
    prisma.blogCategory.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-7 lg:px-8">
      <header className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
          {BRAND.tagline}
        </p>
        <h1 className="font-drama mt-2 text-4xl font-bold text-neutral-900 sm:text-5xl">
          Blog
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-neutral-600">
          Ideas for listening, bedtime routines, and calm screen-free time.
        </p>
      </header>

      <form
        className="mb-8 flex flex-wrap items-center justify-center gap-3"
        action="/blog"
        method="get"
      >
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Search articles…"
          className="w-full max-w-md rounded-xl border border-neutral-200 px-4 py-2.5 text-sm shadow-sm"
        />
        <select
          name="category"
          defaultValue={sp.category ?? ''}
          className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="tag"
          defaultValue={sp.tag}
          placeholder="Tag slug"
          className="w-36 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="featured">Featured</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Apply
        </button>
      </form>

      {featured && !sp.q && !sp.category && !sp.tag && page === 1 && (
        <section className="mb-12 rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-amber-50 p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
            Featured
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-drama text-2xl font-semibold text-neutral-900 sm:text-3xl">
                <Link href={`/blog/${featured.slug}`} className="hover:underline">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-3 text-neutral-600">
                {featured.excerpt ?? featured.seoDescription ?? ''}
              </p>
              <Link
                href={`/blog/${featured.slug}`}
                className="mt-4 inline-flex rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Read article
              </Link>
            </div>
            <Link
              href={`/blog/${featured.slug}`}
              className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-neutral-200"
            >
              {featured.featuredImageUrl ? (
                <Image
                  src={
                    resolvePublicAssetUrl(featured.featuredImageUrl) ??
                    featured.featuredImageUrl
                  }
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 100vw, 40vw"
                />
              ) : null}
            </Link>
          </div>
        </section>
      )}

      {posts.length === 0 ? (
        <p className="py-20 text-center text-neutral-500">
          No articles match your filters yet.
        </p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts
            .filter((p) => p.id !== featured?.id)
            .map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-12 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/blog?page=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}${sp.category ? `&category=${encodeURIComponent(sp.category)}` : ''}${sp.tag ? `&tag=${encodeURIComponent(sp.tag)}` : ''}${sp.sort ? `&sort=${encodeURIComponent(sp.sort)}` : ''}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                p === page
                  ? 'bg-violet-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
