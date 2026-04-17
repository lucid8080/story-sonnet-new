import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getPublicPostBySlug, getRelatedPublicPosts } from '@/lib/blog/queries';
import { sanitizeBlogContentHtml } from '@/lib/blog/sanitize-html';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { BlogContentWithEmbeds } from '@/components/blog/BlogContentWithEmbeds';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';

export const dynamic = 'force-dynamic';

const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
  process.env.NEXTAUTH_URL?.replace(/\/+$/, '') ||
  'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const now = new Date();
  const post = await getPublicPostBySlug(slug, now);
  if (!post) {
    return { title: 'Not found' };
  }
  const title = post.seoTitle?.trim() || post.title;
  const description =
    post.seoDescription?.trim() || post.excerpt?.trim() || BRAND.description;
  const canonical = post.canonicalUrl?.trim() || `${base}/blog/${post.slug}`;
  const ogImage = post.featuredImageUrl
    ? resolvePublicAssetUrl(post.featuredImageUrl) ?? post.featuredImageUrl
    : `${base}/branding/logo.png`;

  return {
    title: `${title} | ${BRAND.productName}`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const now = new Date();
  const post = await getPublicPostBySlug(slug, now);
  if (!post) notFound();

  const html = sanitizeBlogContentHtml(post.contentHtml);
  const tagIds = post.tags.map((t) => t.tagId);
  const related = await getRelatedPublicPosts(
    post.id,
    post.categoryId,
    tagIds,
    now,
    3
  );

  const hero = post.featuredImageUrl
    ? resolvePublicAssetUrl(post.featuredImageUrl) ?? post.featuredImageUrl
    : null;
  const published =
    post.publishedAt ?? post.scheduledAt ?? post.createdAt;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: hero ? [hero] : undefined,
    datePublished: published.toISOString(),
    author: { '@type': 'Person', name: post.authorName || BRAND.productName },
    publisher: { '@type': 'Organization', name: BRAND.productName },
    description: post.excerpt ?? post.seoDescription ?? undefined,
    mainEntityOfPage: `${base}/blog/${post.slug}`,
  };

  const shareUrl = encodeURIComponent(`${base}/blog/${post.slug}`);
  const shareTitle = encodeURIComponent(post.title);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:px-7 lg:px-8">
      <Link
        href="/blog"
        className="text-sm font-semibold text-violet-600 hover:underline"
      >
        ← Back to blog
      </Link>

      <header className="mt-6">
        {post.category && (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="text-xs font-bold uppercase tracking-wide text-violet-600 hover:underline"
          >
            {post.category.name}
          </Link>
        )}
        <h1 className="font-drama mt-2 text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          {post.authorName && <span>{post.authorName} · </span>}
          <time dateTime={published.toISOString()}>
            {published.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          {post.readingTimeMinutes != null && (
            <span> · {post.readingTimeMinutes} min read</span>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((pt) => (
            <Link
              key={pt.tagId}
              href={`/blog/tag/${pt.tag.slug}`}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-violet-100"
            >
              {pt.tag.name}
            </Link>
          ))}
        </div>
      </header>

      {hero && (
        <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-3xl bg-neutral-100">
          <Image
            src={hero}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(max-width:768px) 100vw, 768px"
          />
        </div>
      )}

      <BlogContentWithEmbeds
        className="blog-html-body prose prose-lg prose-neutral mt-10 max-w-none prose-headings:font-drama prose-a:text-violet-600"
        html={html}
      />

      <section className="mt-10 border-t border-neutral-200 pt-8 text-sm text-neutral-600">
        <p className="font-semibold text-neutral-800">Share</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <a
            href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline"
          >
            Twitter / X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline"
          >
            Facebook
          </a>
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-violet-200/50 bg-gradient-to-r from-violet-50 to-sky-50 p-8 text-center">
        <h2 className="font-drama text-2xl font-semibold text-neutral-900">
          Explore the story library
        </h2>
        <p className="mt-2 text-neutral-600">
          Calm audio adventures for kids — pick a story and press play.
        </p>
        <Link
          href="/library"
          className="mt-4 inline-flex rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Browse library
        </Link>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-drama text-2xl font-semibold text-neutral-900">
            Related posts
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <BlogPostCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
