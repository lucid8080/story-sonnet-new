'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Check, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export type NarratorStoryPickerOption = {
  id: string;
  slug: string;
  seriesTitle: string;
  cover: string | null;
  isPublished: boolean;
};

export function NarratorStoryPicker({
  narratorId,
  narratorName,
}: {
  narratorId: string;
  narratorName: string;
}) {
  const [stories, setStories] = useState<NarratorStoryPickerOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pickerRes, assignedRes] = await Promise.all([
        fetch('/api/admin/narrators/story-picker'),
        fetch(`/api/admin/narrators/${encodeURIComponent(narratorId)}/stories`),
      ]);
      const pickerData = (await pickerRes.json()) as {
        ok?: boolean;
        stories?: NarratorStoryPickerOption[];
        error?: string;
      };
      const assignedData = (await assignedRes.json()) as {
        ok?: boolean;
        storyIds?: string[];
        error?: string;
      };
      if (!pickerRes.ok || !pickerData.ok) {
        toast.error(pickerData.error || 'Failed to load stories');
        return;
      }
      if (!assignedRes.ok || !assignedData.ok) {
        toast.error(assignedData.error || 'Failed to load assignments');
        return;
      }
      setStories(pickerData.stories ?? []);
      setSelectedIds(new Set(assignedData.storyIds ?? []));
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [narratorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (nextIds: Set<string>, toggledStoryId: string) => {
    setSavingId(toggledStoryId);
    try {
      const res = await fetch(
        `/api/admin/narrators/${encodeURIComponent(narratorId)}/stories`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyIds: [...nextIds] }),
        }
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Failed to save');
        void load();
        return;
      }
    } catch {
      toast.error('Network error');
      void load();
    } finally {
      setSavingId(null);
    }
  };

  const toggle = (storyId: string) => {
    const next = new Set(selectedIds);
    if (next.has(storyId)) {
      next.delete(storyId);
    } else {
      next.add(storyId);
    }
    setSelectedIds(next);
    void persist(next, storyId);
  };

  if (loading) {
    return (
      <p className="text-sm text-slate-500">Loading story library…</p>
    );
  }

  if (!stories.length) {
    return (
      <p className="text-sm text-slate-500">
        No database-backed stories yet. Save a series from Stories admin first.
      </p>
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Stories for {narratorName}</h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Tap a cover to assign or unassign. Selected: {selectedCount} of{' '}
          {stories.length}
        </p>
      </div>
      <div
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scroll-smooth snap-x snap-mandatory"
        role="list"
        aria-label={`Stories narrated by ${narratorName}`}
      >
        {stories.map((story) => {
          const selected = selectedIds.has(story.id);
          const busy = savingId === story.id;
          return (
            <button
              key={story.id}
              type="button"
              role="listitem"
              disabled={busy}
              onClick={() => toggle(story.id)}
              aria-pressed={selected}
              aria-label={`${selected ? 'Remove' : 'Add'} ${story.seriesTitle}`}
              className={`group relative w-[7.5rem] shrink-0 snap-start text-left transition disabled:opacity-60 sm:w-[8.5rem] ${
                selected
                  ? 'ring-2 ring-violet-500 ring-offset-2 rounded-2xl'
                  : 'opacity-90 hover:opacity-100'
              }`}
            >
              <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-slate-200 shadow-sm">
                {story.cover ? (
                  <Image
                    src={story.cover}
                    alt=""
                    fill
                    className="object-cover transition group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 120px, 136px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImageIcon className="h-8 w-8" aria-hidden />
                  </span>
                )}
                {selected ? (
                  <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
                {!story.isPublished ? (
                  <span className="absolute bottom-0 left-0 right-0 bg-slate-900/75 px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                    Draft
                  </span>
                ) : null}
              </span>
              <span className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-slate-800">
                {story.seriesTitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
