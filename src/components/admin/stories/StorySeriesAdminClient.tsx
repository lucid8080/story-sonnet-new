'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppStory } from '@/lib/stories';
import StoryListPane from './StoryListPane';
import StoryEditor from './StoryEditor';

export default function StorySeriesAdminClient({
  initialStories,
}: {
  initialStories: AppStory[];
}) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const pendingSelectId = useRef<string | null>(null);

  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  useEffect(() => {
    if (pendingSelectId.current) {
      setSelectedId(pendingSelectId.current);
      pendingSelectId.current = null;
    }
  }, [initialStories]);

  const selectedStory =
    selectedId == null
      ? null
      : stories.find((s) => s.id === selectedId) ?? null;

  const handleAddStory = async () => {
    setAdding(true);
    try {
      const res = await fetch('/api/admin/stories', { method: 'POST' });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        console.error('[add story]', data.error);
        return;
      }
      if (data.id) pendingSelectId.current = data.id;
      router.refresh();
    } catch (e) {
      console.error('[add story]', e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-[90rem]">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Story series</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Manage series metadata, library discovery fields, episodes, and
          publishing. Saves require{' '}
          <code className="rounded bg-slate-100 px-1">DATABASE_URL</code>.
          Catalog-only rows are created in the database on first save.
        </p>
      </header>

      <div className="grid min-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <StoryListPane
          stories={stories}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddStory={handleAddStory}
          adding={adding}
        />
        <div className="min-h-[50vh] border-t border-slate-200 lg:border-l lg:border-t-0">
          {selectedStory ? (
            <StoryEditor
              story={selectedStory}
              patchKey={selectedStory.id}
              onSaved={(id) => setSelectedId(id)}
              onDeleted={() => setSelectedId(null)}
              onDuplicated={(newId) => {
                pendingSelectId.current = newId;
              }}
            />
          ) : (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-lg font-bold text-slate-700">
                Select a story to edit
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                Choose a series from the list or add a new draft. Your changes
                stay on this page until you save.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
