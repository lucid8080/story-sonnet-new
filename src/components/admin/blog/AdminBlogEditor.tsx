'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BlogTipTapEditor } from '@/components/admin/blog/BlogTipTapEditor';
import { AiBlogGenerator } from '@/components/admin/blog/AiBlogGenerator';
import { slugifyBlogTitle, normalizeBlogSlug } from '@/lib/blog/slug';

type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string;
  status: string;
  featuredImageUrl: string | null;
  featuredImageStorageKey: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  authorName: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  isFeatured: boolean;
  allowComments: boolean;
  metaKeywords: string | null;
  categoryId: string | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
  linkedKeyword: {
    id: string;
    keyword: string;
    status: string;
  } | null;
};

type Cat = { id: string; name: string; slug: string };
type Tag = { id: string; name: string; slug: string };

export function AdminBlogEditor({ postId }: { postId: string }) {
  const router = useRouter();
  const [post, setPost] = useState<PostRow | null>(null);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editorRev, setEditorRev] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest TipTap HTML; React state can lag behind editor (marks, Save now, partial PATCHes). */
  const contentHtmlRef = useRef<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, c, t] = await Promise.all([
        fetch(`/api/admin/blog/${postId}`),
        fetch('/api/admin/blog/categories'),
        fetch('/api/admin/blog/tags'),
      ]);
      const pj = (await pr.json()) as { ok?: boolean; post?: PostRow };
      const cj = (await c.json()) as { items?: Cat[] };
      const tj = (await t.json()) as { items?: Tag[] };
      if (!pr.ok || !pj.post) {
        toast.error('Failed to load post');
        return;
      }
      setPost(pj.post);
      contentHtmlRef.current = pj.post.contentHtml;
      setCategories(cj.items ?? []);
      setAllTags(tj.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ fileUrl?: string; storageKey?: string }>).detail;
      if (!d?.fileUrl) return;
      setPost((p) =>
        p
          ? {
              ...p,
              featuredImageUrl: d.fileUrl ?? p.featuredImageUrl,
              featuredImageStorageKey: d.storageKey ?? p.featuredImageStorageKey,
            }
          : p
      );
      void savePatch({
        featuredImageUrl: d.fileUrl,
        featuredImageStorageKey: d.storageKey ?? null,
      });
    };
    window.addEventListener('blog-feature-image', h);
    return () => window.removeEventListener('blog-feature-image', h);
  }, [postId]);

  const savePatch = async (partial: Record<string, unknown>) => {
    if (!post) return;
    setSaveState('saving');
    try {
      const body = {
        title: partial.title ?? post.title,
        slug: partial.slug ?? post.slug,
        excerpt: partial.excerpt ?? post.excerpt,
        contentHtml:
          typeof partial.contentHtml === 'string'
            ? partial.contentHtml
            : contentHtmlRef.current,
        status: partial.status ?? post.status,
        featuredImageUrl: partial.featuredImageUrl ?? post.featuredImageUrl,
        featuredImageStorageKey:
          partial.featuredImageStorageKey ?? post.featuredImageStorageKey,
        seoTitle: partial.seoTitle ?? post.seoTitle,
        seoDescription: partial.seoDescription ?? post.seoDescription,
        canonicalUrl: partial.canonicalUrl ?? post.canonicalUrl,
        authorName: partial.authorName ?? post.authorName,
        publishedAt: partial.publishedAt
          ? new Date(partial.publishedAt as string)
          : post.publishedAt
            ? new Date(post.publishedAt)
            : null,
        scheduledAt: partial.scheduledAt
          ? new Date(partial.scheduledAt as string)
          : post.scheduledAt
            ? new Date(post.scheduledAt)
            : null,
        isFeatured: partial.isFeatured ?? post.isFeatured,
        allowComments: partial.allowComments ?? post.allowComments,
        metaKeywords: partial.metaKeywords ?? post.metaKeywords,
        categoryId: partial.categoryId ?? post.categoryId,
        tagIds: (partial.tagIds as string[] | undefined) ?? post.tags.map((x) => x.tag.id),
      };
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; post?: PostRow; error?: string };
      if (!res.ok || !data.ok || !data.post) {
        toast.error(data.error ?? 'Save failed');
        setSaveState('error');
        return;
      }
      setPost(data.post);
      contentHtmlRef.current = data.post.contentHtml;
      setSaveState('saved');
      router.refresh();
      setTimeout(() => setSaveState('idle'), 1500);
    } catch {
      setSaveState('error');
      toast.error('Save failed');
    }
  };

  const scheduleDebounced = (partial: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void savePatch(partial);
    }, 900);
  };

  if (loading || !post) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-8">
        Loading…
      </div>
    );
  }

  const selectedTagIds = new Set(post.tags.map((x) => x.tag.id));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">Edit post</h1>
            <p className="text-xs text-slate-500">
              {saveState === 'saving' && 'Saving…'}
              {saveState === 'saved' && 'Saved'}
              {saveState === 'error' && 'Save error'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => void savePatch({})}
            >
              Save now
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={async () => {
                const res = await fetch(`/api/admin/blog/${postId}/duplicate`, {
                  method: 'POST',
                });
                const data = (await res.json()) as { post?: { id: string } };
                if (data.post?.id) router.push(`/admin/blog/${data.post.id}`);
              }}
            >
              Duplicate
            </button>
          </div>
        </div>

        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Title</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={post.title}
            onChange={(e) => {
              const title = e.target.value;
              const nextSlug = normalizeBlogSlug(slugifyBlogTitle(title));
              setPost((p) => (p ? { ...p, title, slug: nextSlug } : p));
            }}
            onBlur={() => scheduleDebounced({ title: post.title, slug: post.slug })}
          />
        </label>

        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Slug</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
            value={post.slug}
            onChange={(e) =>
              setPost((p) => (p ? { ...p, slug: e.target.value } : p))
            }
            onBlur={(e) => {
              const normalized = normalizeBlogSlug(
                slugifyBlogTitle(e.target.value)
              );
              setPost((p) => (p ? { ...p, slug: normalized } : p));
              scheduleDebounced({ slug: normalized });
            }}
          />
        </label>

        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Excerpt</span>
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2"
            value={post.excerpt ?? ''}
            onChange={(e) =>
              setPost((p) => (p ? { ...p, excerpt: e.target.value } : p))
            }
            onBlur={() => scheduleDebounced({ excerpt: post.excerpt })}
          />
        </label>

        <div>
          <span className="text-sm font-semibold text-slate-700">Content</span>
          <div className="mt-2">
            <BlogTipTapEditor
              key={editorRev}
              blogSlug={post.slug}
              content={post.contentHtml}
              onChange={(html) => {
                contentHtmlRef.current = html;
                setPost((p) => (p ? { ...p, contentHtml: html } : p));
                scheduleDebounced({ contentHtml: html });
              }}
            />
          </div>
        </div>

        <AiBlogGenerator
          postId={post.id}
          blogSlug={post.slug}
          imageContext={{
            title: post.title,
            excerpt: post.excerpt ?? '',
            tagNames: post.tags.map((t) => t.tag.name),
            getContentHtml: () => contentHtmlRef.current,
          }}
          onApplyArticle={(payload) => {
            const nextHtml =
              payload.contentHtml != null && payload.contentHtml !== ''
                ? payload.contentHtml
                : contentHtmlRef.current;
            const trimmedTitle =
              payload.title != null ? String(payload.title).trim() : '';
            const hasNewTitle = trimmedTitle !== '';
            const mergedTitle = hasNewTitle ? trimmedTitle : post.title;
            const nextSlug = hasNewTitle
              ? normalizeBlogSlug(slugifyBlogTitle(trimmedTitle))
              : post.slug;

            contentHtmlRef.current = nextHtml;
            setPost((p) => {
              if (!p) return p;
              return {
                ...p,
                title: mergedTitle,
                slug: nextSlug,
                excerpt: payload.excerpt ?? p.excerpt,
                contentHtml: nextHtml,
                seoTitle: payload.seoTitle ?? p.seoTitle,
                seoDescription: payload.seoDescription ?? p.seoDescription,
              };
            });
            setEditorRev((r) => r + 1);
            void savePatch({
              ...payload,
              contentHtml: nextHtml,
              slug: nextSlug,
              title: mergedTitle,
            });
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">SEO title</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={post.seoTitle ?? ''}
              onChange={(e) =>
                setPost((p) => (p ? { ...p, seoTitle: e.target.value } : p))
              }
              onBlur={() => scheduleDebounced({ seoTitle: post.seoTitle })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Meta keywords</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={post.metaKeywords ?? ''}
              onChange={(e) =>
                setPost((p) => (p ? { ...p, metaKeywords: e.target.value } : p))
              }
              onBlur={() => scheduleDebounced({ metaKeywords: post.metaKeywords })}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">SEO description</span>
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2"
            value={post.seoDescription ?? ''}
            onChange={(e) =>
              setPost((p) => (p ? { ...p, seoDescription: e.target.value } : p))
            }
            onBlur={() => scheduleDebounced({ seoDescription: post.seoDescription })}
          />
        </label>
      </div>

      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Publish</h2>
          <p className="text-xs text-slate-500">Status: {post.status}</p>
        </div>
        <label className="block text-xs font-semibold text-slate-600">
          Status
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={post.status}
            onChange={(e) => {
              const status = e.target.value;
              setPost((p) => (p ? { ...p, status } : p));
              void savePatch({ status });
            }}
          >
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Schedule at (UTC-ish local)
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={
              post.scheduledAt
                ? new Date(post.scheduledAt).toISOString().slice(0, 16)
                : ''
            }
            onChange={(e) => {
              const v = e.target.value;
              const d = v ? new Date(v) : null;
              setPost((p) =>
                p ? { ...p, scheduledAt: d ? d.toISOString() : null } : p
              );
            }}
            onBlur={() =>
              void savePatch({
                scheduledAt: post.scheduledAt,
                status: post.status === 'SCHEDULED' ? 'SCHEDULED' : post.status,
              })
            }
          />
        </label>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => void savePatch({ status: 'PUBLISHED' })}
          >
            Publish now
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
            onClick={() => void savePatch({ status: 'DRAFT' })}
          >
            Move to draft
          </button>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Category
          </h3>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={post.categoryId ?? ''}
            onChange={(e) => {
              const categoryId = e.target.value || null;
              setPost((p) => (p ? { ...p, categoryId } : p));
              void savePatch({ categoryId });
            }}
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Tags
          </h3>
          <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
            {allTags.map((t) => (
              <label key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(t.id)}
                  onChange={() => {
                    const next = new Set(selectedTagIds);
                    if (next.has(t.id)) next.delete(t.id);
                    else next.add(t.id);
                    const tagIds = [...next];
                    setPost((p) =>
                      p
                        ? {
                            ...p,
                            tags: tagIds.map((id) => {
                              const tag = allTags.find((x) => x.id === id)!;
                              return { tag };
                            }),
                          }
                        : p
                    );
                    void savePatch({ tagIds });
                  }}
                />
                {t.name}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={post.isFeatured}
            onChange={(e) => {
              const isFeatured = e.target.checked;
              setPost((p) => (p ? { ...p, isFeatured } : p));
              void savePatch({ isFeatured });
            }}
          />
          Featured on blog home
        </label>

        <div>
          <h3 className="text-xs font-bold text-slate-500">Featured image</h3>
          {post.featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.featuredImageUrl}
              alt=""
              className="mt-2 max-h-40 w-full rounded-lg object-cover"
            />
          ) : (
            <p className="mt-1 text-xs text-slate-400">No image</p>
          )}
          <label className="mt-2 block">
            <span className="text-xs font-semibold text-slate-600">Upload</span>
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('file', file);
                fd.append('assetKind', 'blog_cover');
                fd.append('blogSlug', post.slug);
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                const data = (await res.json()) as {
                  fileUrl?: string;
                  storagePath?: string;
                };
                if (data.fileUrl) {
                  setPost((p) =>
                    p
                      ? {
                          ...p,
                          featuredImageUrl: data.fileUrl!,
                          featuredImageStorageKey: data.storagePath ?? null,
                        }
                      : p
                  );
                  void savePatch({
                    featuredImageUrl: data.fileUrl,
                    featuredImageStorageKey: data.storagePath,
                  });
                }
              }}
            />
          </label>
        </div>

        {post.linkedKeyword && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs">
            <div className="font-semibold text-amber-900">Keyword</div>
            <div>{post.linkedKeyword.keyword}</div>
            <div className="text-amber-800">{post.linkedKeyword.status}</div>
            <Link
              href={`/admin/blog/keywords?highlight=${post.linkedKeyword.id}`}
              className="mt-1 inline-block text-violet-700 underline"
            >
              Open keyword bank
            </Link>
          </div>
        )}

        <Link
          href={`/blog/${post.slug}`}
          className="block text-center text-sm text-violet-600 underline"
          target="_blank"
          rel="noreferrer"
        >
          View public URL
        </Link>
      </aside>
    </div>
  );
}
