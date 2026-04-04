'use client';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { StoryFormState } from '@/lib/admin/story-form';
import { emptyEpisodeForm } from '@/lib/admin/story-form';

export default function StoryEpisodesSection({
  form,
  onChange,
}: {
  form: StoryFormState;
  onChange: (next: StoryFormState) => void;
}) {
  const field =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200';

  const reorder = (from: number, to: number) => {
    const eps = [...form.episodes];
    const [m] = eps.splice(from, 1);
    eps.splice(to, 0, m);
    onChange({
      ...form,
      episodes: eps.map((e, i) => ({ ...e, episodeNumber: i + 1 })),
    });
  };

  const updateEp = (index: number, patch: Partial<(typeof form.episodes)[0]>) => {
    const episodes = form.episodes.map((e, i) =>
      i === index ? { ...e, ...patch } : e
    );
    onChange({ ...form, episodes });
  };

  const removeEp = (index: number) => {
    if (form.episodes.length <= 1) return;
    if (!confirm('Remove this episode?')) return;
    const episodes = form.episodes
      .filter((_, i) => i !== index)
      .map((e, i) => ({ ...e, episodeNumber: i + 1 }));
    onChange({ ...form, episodes });
  };

  const addEp = () => {
    const n = form.episodes.length + 1;
    onChange({
      ...form,
      episodes: [...form.episodes, emptyEpisodeForm(`new-${crypto.randomUUID()}`, n)],
    });
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Episodes
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Reorder with arrows. Slugs must be unique per story when set.
          </p>
        </div>
        <button
          type="button"
          onClick={addEp}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add episode
        </button>
      </div>

      <ul className="mt-4 space-y-4">
        {form.episodes.map((ep, index) => (
          <li
            key={ep.id}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-500">
                Episode {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => reorder(index, index - 1)}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === form.episodes.length - 1}
                  onClick={() => reorder(index, index + 1)}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove episode"
                  onClick={() => removeEp(index)}
                  className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Title
                </span>
                <input
                  className={field}
                  value={ep.title}
                  onChange={(e) => updateEp(index, { title: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600">
                  Slug
                </span>
                <input
                  className={field}
                  value={ep.slug}
                  onChange={(e) =>
                    updateEp(index, {
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600">
                  Label
                </span>
                <input
                  className={field}
                  value={ep.label}
                  onChange={(e) => updateEp(index, { label: e.target.value })}
                  placeholder="Episode 1"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Short summary
                </span>
                <textarea
                  rows={2}
                  className={field}
                  value={ep.summary}
                  onChange={(e) => updateEp(index, { summary: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600">
                  Minutes
                </span>
                <input
                  type="number"
                  min={0}
                  className={field}
                  value={ep.durationMinutes}
                  onChange={(e) =>
                    updateEp(index, { durationMinutes: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600">
                  Extra seconds
                </span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  className={field}
                  value={ep.durationSeconds}
                  onChange={(e) =>
                    updateEp(index, { durationSeconds: e.target.value })
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Audio URL (legacy public MP3, optional)
                </span>
                <input
                  className={field}
                  value={ep.audioUrl}
                  onChange={(e) => updateEp(index, { audioUrl: e.target.value })}
                  placeholder="https://… or /audio/… when not using private R2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600">
                  Private audio key (R2 object key, paywalled)
                </span>
                <input
                  className={field}
                  value={ep.audioStorageKey}
                  onChange={(e) =>
                    updateEp(index, { audioStorageKey: e.target.value })
                  }
                  placeholder="e.g. audio/story-slug/episode-1.mp3"
                />
              </label>
              <div className="flex flex-wrap gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={ep.isPublished}
                    onChange={(e) =>
                      updateEp(index, { isPublished: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={ep.isPremium}
                    onChange={(e) =>
                      updateEp(index, { isPremium: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Premium
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={ep.isFreePreview}
                    onChange={(e) =>
                      updateEp(index, { isFreePreview: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Free preview (no subscription)
                </label>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
