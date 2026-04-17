import Link from 'next/link';
import Image from 'next/image';
import type { BlogPostWithRelations } from '@/lib/blog/queries';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

export function BlogPostCard({ post }: { post: BlogPostWithRelations }) {
  const img = post.featuredImageUrl
    ? resolvePublicAssetUrl(post.featuredImageUrl) ?? post.featuredImageUrl
    : null;
  const excerpt = post.excerpt?.trim() || post.seoDescription?.trim() || '';
  const date =
    post.publishedAt ?? post.scheduledAt ?? post.createdAt;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
        {img ? (
          <Image
            src={img}
            alt=""
            fill
            className="object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width:768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Story Sonnet
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {post.category && (
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="text-violet-700 hover:underline"
            >
              {post.category.name}
            </Link>
          )}
          <time dateTime={date.toISOString()}>
            {date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </div>
        <h2 className="font-drama text-xl font-semibold leading-snug text-neutral-900">
          <Link href={`/blog/${post.slug}`} className="hover:text-violet-700">
            {post.title}
          </Link>
        </h2>
        {excerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-neutral-600">{excerpt}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.slice(0, 4).map((pt) => (
            <Link
              key={pt.tagId}
              href={`/blog/tag/${pt.tag.slug}`}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 hover:bg-violet-100 hover:text-violet-800"
            >
              {pt.tag.name}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
