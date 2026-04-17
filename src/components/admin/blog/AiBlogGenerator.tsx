'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type Tab = 'scratch' | 'keywords' | 'rewrite';

export function AiBlogGenerator({
  blogSlug,
  onApplyArticle,
}: {
  blogSlug: string;
  onApplyArticle: (payload: {
    title?: string;
    excerpt?: string;
    contentHtml?: string;
    seoTitle?: string;
    seoDescription?: string;
  }) => void;
}) {
  const [tab, setTab] = useState<Tab>('scratch');
  const [loading, setLoading] = useState(false);

  const [scratch, setScratch] = useState({
    topic: '',
    audience: '',
    tone: '',
    length: 'medium' as 'short' | 'medium' | 'long',
    categoryHint: '',
    cta: '',
    seoIntent: '',
    imageStylePrompt: '',
  });

  const [kw, setKw] = useState({
    primaryKeywords: '',
    secondaryKeywords: '',
    audience: '',
    tone: '',
    length: 'medium' as 'short' | 'medium' | 'long',
    siteContext: '',
    imageStyle: '',
  });

  const [rewrite, setRewrite] = useState({
    contentHtml: '',
    goal: 'seo' as 'seo' | 'simplify' | 'warmer' | 'professional' | 'shorter' | 'expand',
    extraInstructions: '',
  });

  const runText = async () => {
    setLoading(true);
    try {
      let body: Record<string, unknown>;
      if (tab === 'scratch') {
        body = { mode: 'scratch', ...scratch };
      } else if (tab === 'keywords') {
        body = { mode: 'keywords', ...kw };
      } else {
        body = { mode: 'rewrite', ...rewrite };
      }
      const res = await fetch('/api/admin/blog/generate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        payload?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Generation failed');
        return;
      }
      const p = data.payload;
      if (!p) return;
      if (tab === 'rewrite') {
        onApplyArticle({
          title: p.title as string | undefined,
          excerpt: p.excerpt as string | undefined,
          contentHtml: p.contentHtml as string,
          seoTitle: p.seoTitle as string | undefined,
          seoDescription: p.seoDescription as string | undefined,
        });
      } else {
        onApplyArticle({
          title: p.title as string,
          excerpt: p.excerpt as string,
          contentHtml: p.contentHtml as string,
          seoTitle: p.seoTitle as string | undefined,
          seoDescription: p.seoDescription as string | undefined,
        });
      }
      toast.success('Draft inserted — review before publishing');
    } catch (e) {
      console.error(e);
      toast.error('Request failed');
    } finally {
      setLoading(false);
    }
  };

  const runImage = async () => {
    const prompt = window.prompt('Image prompt', 'Soft watercolor, cozy reading nook, warm light');
    if (!prompt) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-blog-slug': blogSlug,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        fileUrl?: string;
        storageKey?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Image failed');
        return;
      }
      window.dispatchEvent(
        new CustomEvent('blog-feature-image', {
          detail: { fileUrl: data.fileUrl, storageKey: data.storageKey },
        })
      );
      toast.success('Feature image generated');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'scratch', label: 'From scratch' },
    { id: 'keywords', label: 'From keywords' },
    { id: 'rewrite', label: 'Rewrite' },
  ];

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <h3 className="text-sm font-bold text-violet-900">AI Blog Generator</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tab === t.id
                ? 'bg-violet-600 text-white'
                : 'bg-white text-violet-800 ring-1 ring-violet-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'scratch' && (
        <div className="mt-3 grid gap-2 text-sm">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Topic</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
              value={scratch.topic}
              onChange={(e) => setScratch((s) => ({ ...s, topic: e.target.value }))}
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label>
              <span className="text-xs font-medium text-slate-600">Audience</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
                value={scratch.audience}
                onChange={(e) =>
                  setScratch((s) => ({ ...s, audience: e.target.value }))
                }
              />
            </label>
            <label>
              <span className="text-xs font-medium text-slate-600">Tone</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
                value={scratch.tone}
                onChange={(e) => setScratch((s) => ({ ...s, tone: e.target.value }))}
              />
            </label>
          </div>
          <label>
            <span className="text-xs font-medium text-slate-600">Length</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
              value={scratch.length}
              onChange={(e) =>
                setScratch((s) => ({
                  ...s,
                  length: e.target.value as typeof scratch.length,
                }))
              }
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </label>
        </div>
      )}

      {tab === 'keywords' && (
        <div className="mt-3 grid gap-2 text-sm">
          <label>
            <span className="text-xs font-medium text-slate-600">Primary keywords</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-200 px-2 py-1.5"
              value={kw.primaryKeywords}
              onChange={(e) => setKw((k) => ({ ...k, primaryKeywords: e.target.value }))}
            />
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Secondary</span>
            <textarea
              className="mt-1 min-h-[48px] w-full rounded-lg border border-slate-200 px-2 py-1.5"
              value={kw.secondaryKeywords}
              onChange={(e) =>
                setKw((k) => ({ ...k, secondaryKeywords: e.target.value }))
              }
            />
          </label>
        </div>
      )}

      {tab === 'rewrite' && (
        <div className="mt-3 grid gap-2 text-sm">
          <label>
            <span className="text-xs font-medium text-slate-600">Paste HTML to rewrite</span>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs"
              value={rewrite.contentHtml}
              onChange={(e) =>
                setRewrite((r) => ({ ...r, contentHtml: e.target.value }))
              }
            />
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Goal</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
              value={rewrite.goal}
              onChange={(e) =>
                setRewrite((r) => ({
                  ...r,
                  goal: e.target.value as typeof rewrite.goal,
                }))
              }
            >
              <option value="seo">SEO improve</option>
              <option value="simplify">Simplify</option>
              <option value="warmer">Warmer</option>
              <option value="professional">Professional</option>
              <option value="shorter">Shorter</option>
              <option value="expand">Expand</option>
            </select>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void runText()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? 'Working…' : 'Generate text'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runImage()}
          className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"
        >
          Generate feature image
        </button>
      </div>
    </div>
  );
}
