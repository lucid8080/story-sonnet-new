'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppStory } from '@/lib/stories';
import { isNumericDbStoryId } from '@/lib/stories';
import { appStoryToForm, formToAdminUpsertPayload } from '@/lib/admin/story-mappers';
import {
  cloneStoryFormState,
  formsEqual,
  type StoryFormState,
} from '@/lib/admin/story-form';
import StoryEditorHeader from './StoryEditorHeader';
import StoryBasicsSection from './StoryBasicsSection';
import StoryDiscoverySection from './StoryDiscoverySection';
import StorySeriesSection from './StorySeriesSection';
import StoryDisplaySection from './StoryDisplaySection';
import StoryEpisodesSection from './StoryEpisodesSection';
import StorySeoSection from './StorySeoSection';

export default function StoryEditor({
  story,
  patchKey,
  onSaved,
  onDeleted,
  onDuplicated,
}: {
  story: AppStory;
  patchKey: string;
  onSaved?: (canonicalId: string) => void;
  onDeleted?: () => void;
  onDuplicated?: (newId: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<StoryFormState>(() =>
    appStoryToForm(story)
  );
  const [baseline, setBaseline] = useState<StoryFormState>(() =>
    cloneStoryFormState(appStoryToForm(story))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [duping, setDuping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next = appStoryToForm(story);
    setForm(next);
    setBaseline(cloneStoryFormState(next));
    setSaveError(null);
    setSaveSuccess(false);
    // Re-sync form when switching list selection (by id/slug), not on every parent re-render.
  }, [story.id, story.slug]); // eslint-disable-line react-hooks/exhaustive-deps -- story

  const dirty = !formsEqual(form, baseline);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = formToAdminUpsertPayload(form);
      const res = await fetch(
        `/api/admin/stories/${encodeURIComponent(patchKey)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setSaveError(data.error || `Save failed (${res.status})`);
        return;
      }
      if (data.id) {
        onSaved?.(data.id);
      }
      const nextBaseline = cloneStoryFormState(form);
      setBaseline(nextBaseline);
      setSaveSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSaveSuccess(false), 4000);
      router.refresh();
    } catch {
      setSaveError('Network error');
    } finally {
      setSaving(false);
    }
  }, [form, patchKey, router, onSaved]);

  const onCancel = () => {
    setForm(cloneStoryFormState(baseline));
    setSaveError(null);
  };

  const onReset = () => {
    setForm(cloneStoryFormState(baseline));
    setSaveError(null);
  };

  const onDuplicate = async () => {
    if (!isNumericDbStoryId(story.id)) {
      setSaveError('Save this story to the database before duplicating.');
      return;
    }
    setDuping(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/admin/stories/${encodeURIComponent(story.id)}/duplicate`,
        { method: 'POST' }
      );
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setSaveError(data.error || 'Duplicate failed');
        return;
      }
      if (data.id) onDuplicated?.(data.id);
      router.refresh();
    } catch {
      setSaveError('Network error');
    } finally {
      setDuping(false);
    }
  };

  const onDelete = async () => {
    if (!isNumericDbStoryId(story.id)) {
      setSaveError('Only database-backed stories can be deleted.');
      return;
    }
    if (
      !confirm(
        'Delete this story and all episodes? This cannot be undone.'
      )
    ) {
      return;
    }
    setDeleting(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/admin/stories/${encodeURIComponent(story.id)}`,
        { method: 'DELETE' }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveError(data.error || 'Delete failed');
        return;
      }
      onDeleted?.();
      router.refresh();
    } catch {
      setSaveError('Network error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col bg-slate-50/50">
      <StoryEditorHeader
        title={story.title}
        dirty={dirty}
        saving={saving}
        saveError={saveError}
        saveSuccess={saveSuccess}
        onSave={onSave}
        onCancel={onCancel}
        onReset={onReset}
        disabled={deleting || duping}
      />
      <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-white px-4 py-2 sm:px-6">
        <button
          type="button"
          onClick={onDuplicate}
          disabled={duping || deleting}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {duping ? 'Duplicating…' : 'Duplicate story'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || duping}
          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete story'}
        </button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <StoryBasicsSection form={form} onChange={setForm} />
        <StoryDiscoverySection form={form} onChange={setForm} />
        <StorySeriesSection form={form} onChange={setForm} />
        <StoryDisplaySection form={form} onChange={setForm} />
        <StoryEpisodesSection form={form} onChange={setForm} />
        <StorySeoSection form={form} onChange={setForm} />
      </div>
    </div>
  );
}
