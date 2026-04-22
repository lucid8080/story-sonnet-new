'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  plainTextFromHtml,
  truncateForImagePrompt,
} from '@/lib/blog/reading-time';
import {
  BLOG_FEATURE_IMAGE_STYLE_PRESETS,
  presetPreview,
  type BlogFeatureImageStylePreset,
} from '@/components/admin/blog/blogFeatureImageStylePresets';
import { GenerationToolSelector } from '@/components/admin/generation/GenerationToolSelector';

type Tab = 'scratch' | 'keywords' | 'rewrite';

export type BlogFeatureImageContext = {
  title: string;
  excerpt: string;
  tagNames: string[];
  /** Latest editor HTML (may include unsaved edits). */
  getContentHtml: () => string;
};

function buildSuggestedContentDirection(
  title: string,
  excerpt: string,
  bodyPlain: string
): string {
  const t = title.trim();
  const e = excerpt.trim();
  if (t && e) {
    const base = `Visual scene for the post: ${t}. ${e}`;
    return base.length > 800 ? `${base.slice(0, 797)}…` : base;
  }
  if (e) {
    const base = `Visual scene for the post: ${e}`;
    return base.length > 800 ? `${base.slice(0, 797)}…` : base;
  }
  if (t && bodyPlain) {
    const snippet = truncateForImagePrompt(bodyPlain, 480);
    return `Imagery reflecting the article: ${snippet}`;
  }
  if (bodyPlain) {
    return `Imagery reflecting the article: ${truncateForImagePrompt(bodyPlain, 720)}`;
  }
  if (t) {
    return t.length > 760
      ? `Visual scene for the post: ${t.slice(0, 757)}…`
      : `Visual scene for the post: ${t}`;
  }
  return '';
}

export function AiBlogGenerator({
  postId,
  blogSlug,
  imageContext,
  onApplyArticle,
}: {
  postId?: string;
  blogSlug: string;
  imageContext?: BlogFeatureImageContext;
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

  const [featureContentDirection, setFeatureContentDirection] = useState('');
  const [featureImageStyle, setFeatureImageStyle] = useState('');
  const [featureAdditionalNotes, setFeatureAdditionalNotes] = useState('');
  const [contentDirectionTouched, setContentDirectionTouched] = useState(false);
  const [stylePresetModalOpen, setStylePresetModalOpen] = useState(false);
  const [customStylePresets, setCustomStylePresets] = useState<
    BlogFeatureImageStylePreset[]
  >([]);
  const [stylePresetPhase, setStylePresetPhase] = useState<'pick' | 'add'>(
    'pick'
  );
  const [newPresetLabel, setNewPresetLabel] = useState('');
  const [newPresetText, setNewPresetText] = useState('');

  const titleForImage = imageContext?.title ?? '';
  const excerptForImage = imageContext?.excerpt ?? '';
  const bodyPlainForImage = imageContext
    ? plainTextFromHtml(imageContext.getContentHtml())
    : '';

  const suggestedContentDirection = useMemo(
    () =>
      buildSuggestedContentDirection(
        titleForImage,
        excerptForImage,
        bodyPlainForImage
      ),
    [titleForImage, excerptForImage, bodyPlainForImage]
  );

  useEffect(() => {
    setContentDirectionTouched(false);
  }, [postId]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/blog/admin-settings');
        const data = (await res.json()) as {
          ok?: boolean;
          featureImageStyleCustomPresets?: BlogFeatureImageStylePreset[];
        };
        if (
          res.ok &&
          data.ok &&
          Array.isArray(data.featureImageStyleCustomPresets)
        ) {
          setCustomStylePresets(data.featureImageStyleCustomPresets);
        }
      } catch {
        toast.error('Could not load custom style presets');
      }
    })();
  }, []);

  useEffect(() => {
    if (!stylePresetModalOpen) setStylePresetPhase('pick');
  }, [stylePresetModalOpen]);

  useEffect(() => {
    if (!imageContext) return;
    if (contentDirectionTouched) return;
    setFeatureContentDirection(suggestedContentDirection);
  }, [
    imageContext,
    suggestedContentDirection,
    contentDirectionTouched,
  ]);

  useEffect(() => {
    if (!stylePresetModalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setStylePresetModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stylePresetModalOpen]);

  const persistCustomPresets = async (
    next: BlogFeatureImageStylePreset[]
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/blog/admin-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureImageStyleCustomPresets: next,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        featureImageStyleCustomPresets?: BlogFeatureImageStylePreset[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Save failed');
        return false;
      }
      setCustomStylePresets(data.featureImageStyleCustomPresets ?? next);
      return true;
    } catch {
      toast.error('Save failed');
      return false;
    }
  };

  const removeCustomPreset = async (id: string) => {
    const next = customStylePresets.filter((p) => p.id !== id);
    if (next.length === customStylePresets.length) return;
    const ok = await persistCustomPresets(next);
    if (ok) toast.success('Preset removed');
  };

  const saveNewCustomPreset = async () => {
    const label = newPresetLabel.trim();
    const text = newPresetText.trim();
    if (!label || !text) {
      toast.error('Label and style text are required');
      return;
    }
    const id = `custom-${crypto.randomUUID()}`;
    const next = [...customStylePresets, { id, label, text }];
    const ok = await persistCustomPresets(next);
    if (ok) {
      toast.success('Custom preset saved');
      setStylePresetPhase('pick');
      setNewPresetLabel('');
      setNewPresetText('');
    }
  };

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
    const html = imageContext?.getContentHtml() ?? '';
    const contentSummary = html
      ? truncateForImagePrompt(plainTextFromHtml(html))
      : undefined;

    const body: Record<string, unknown> = {
      contentDirection: featureContentDirection.trim() || undefined,
      imageStyle: featureImageStyle.trim() || undefined,
      prompt: featureAdditionalNotes.trim() || undefined,
      title: imageContext?.title.trim().slice(0, 300) || undefined,
      excerpt: imageContext?.excerpt.trim().slice(0, 500) || undefined,
      contentSummary: contentSummary || undefined,
      keywords:
        imageContext?.tagNames?.filter((k) => k.trim().length > 0) ?? undefined,
    };

    const hasGround =
      Boolean(body.contentDirection) ||
      Boolean(body.imageStyle) ||
      Boolean(body.prompt) ||
      Boolean(body.title) ||
      Boolean(body.excerpt) ||
      Boolean(body.contentSummary) ||
      (Array.isArray(body.keywords) && body.keywords.length > 0);

    if (!hasGround) {
      toast.error(
        'Add title or body to the post, or fill content direction, style, or additional notes.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-blog-slug': blogSlug,
        },
        body: JSON.stringify(body),
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

      <div className="mt-4 border-t border-violet-200/80 pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-900">
          Feature image
        </p>
        <p className="mt-1 text-xs text-slate-600">
          The post title, excerpt, tags, and article text are sent automatically so
          the image matches your content. Describe the scene and the look you want.
        </p>
        <label className="mt-2 block">
          <span className="text-xs font-medium text-slate-600">
            Content direction
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-400">
            What to depict: subjects, setting, mood, metaphor (no text in the image).
          </span>
          <textarea
            className="mt-1 min-h-[64px] w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={featureContentDirection}
            onChange={(e) => {
              setContentDirectionTouched(true);
              setFeatureContentDirection(e.target.value);
            }}
            placeholder="e.g. Family crafting together at a table, devices out of frame…"
          />
        </label>
        <label className="mt-2 block">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">
              Style of image
            </span>
            <button
              type="button"
              className="rounded-md border border-violet-300 bg-white px-2 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100"
              onClick={() => setStylePresetModalOpen(true)}
            >
              Choose style preset…
            </button>
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-400">
            Medium, lighting, palette — editorial photo, watercolor, soft 3D, etc.
          </span>
          <textarea
            className="mt-1 min-h-[56px] w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={featureImageStyle}
            onChange={(e) => setFeatureImageStyle(e.target.value)}
            placeholder="e.g. Warm natural light, soft focus, cozy interior…"
          />
        </label>
        <label className="mt-2 block">
          <span className="text-xs font-medium text-slate-600">
            Additional notes
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-400">
            Optional extra art direction.
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={featureAdditionalNotes}
            onChange={(e) => setFeatureAdditionalNotes(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      {stylePresetModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => setStylePresetModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feature-image-style-presets-title"
            className="max-h-[min(80vh,560px)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <h4
                id="feature-image-style-presets-title"
                className="text-sm font-bold text-slate-900"
              >
                {stylePresetPhase === 'pick'
                  ? 'Style presets'
                  : 'New custom preset'}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500">
                {stylePresetPhase === 'pick'
                  ? 'Pick a look; you can edit the text afterward. Custom presets are saved for all admins.'
                  : 'Name it and save the style prompt text. It appears under Your presets.'}
              </p>
            </div>

            {stylePresetPhase === 'pick' ? (
              <>
                <div className="max-h-[min(60vh,400px)] overflow-y-auto p-2">
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Built-in
                  </p>
                  <ul>
                    {BLOG_FEATURE_IMAGE_STYLE_PRESETS.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left text-sm transition hover:border-violet-300 hover:bg-violet-50"
                          onClick={() => {
                            setFeatureImageStyle(p.text);
                            setStylePresetModalOpen(false);
                          }}
                        >
                          <span className="font-semibold text-slate-900">
                            {p.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {presetPreview(p.text)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {customStylePresets.length > 0 ? (
                    <>
                      <p className="mt-3 px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Your presets
                      </p>
                      <ul>
                        {customStylePresets.map((p) => (
                          <li key={p.id} className="mb-2 flex gap-1">
                            <button
                              type="button"
                              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-violet-50/50 px-3 py-2.5 text-left text-sm transition hover:border-violet-300 hover:bg-violet-50"
                              onClick={() => {
                                setFeatureImageStyle(p.text);
                                setStylePresetModalOpen(false);
                              }}
                            >
                              <span className="font-semibold text-slate-900">
                                {p.label}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {presetPreview(p.text)}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="shrink-0 self-stretch rounded-xl border border-slate-200 px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => void removeCustomPreset(p.id)}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    className="w-full rounded-lg border border-violet-300 bg-violet-50 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100"
                    onClick={() => {
                      setNewPresetLabel('');
                      setNewPresetText(featureImageStyle);
                      setStylePresetPhase('add');
                    }}
                  >
                    Save current style as preset…
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setStylePresetModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3 p-4">
                <label className="block text-sm">
                  <span className="text-xs font-medium text-slate-600">
                    Label
                  </span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    value={newPresetLabel}
                    onChange={(e) => setNewPresetLabel(e.target.value)}
                    placeholder="e.g. Cozy reading nook watercolor"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-medium text-slate-600">
                    Style prompt
                  </span>
                  <textarea
                    className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs"
                    value={newPresetText}
                    onChange={(e) => setNewPresetText(e.target.value)}
                  />
                </label>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setStylePresetPhase('pick')}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                    onClick={() => void saveNewCustomPreset()}
                  >
                    Save preset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <GenerationToolSelector
          family="text"
          toolKey="blog_generate_text"
          label="Provider + Model (Generate text)"
        />
        <GenerationToolSelector
          family="image"
          toolKey="blog_generate_image"
          label="Provider + Model (Generate image)"
        />
      </div>

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
