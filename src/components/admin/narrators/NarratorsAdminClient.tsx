'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { NarratorStoryPicker } from './NarratorStoryPicker';
type NarratorRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  sortOrder: number;
};

type Draft = {
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string;
  sortOrder: string;
};

function emptyDraft(): Draft {
  return { name: '', slug: '', bio: '', avatarUrl: '', sortOrder: '0' };
}

function rowToDraft(row: NarratorRow): Draft {
  return {
    name: row.name,
    slug: row.slug,
    bio: row.bio ?? '',
    avatarUrl: row.avatarUrl ?? '',
    sortOrder: String(row.sortOrder),
  };
}

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NarratorsAdminClient() {
  const [rows, setRows] = useState<NarratorRow[]>([]);
  const [createDraft, setCreateDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/narrators');
    const data = (await res.json()) as {
      ok?: boolean;
      items?: NarratorRow[];
      error?: string;
    };
    if (!res.ok || !data.ok) {
      toast.error(data.error || 'Failed to load narrators');
      return;
    }
    setRows(data.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const payloadFromDraft = (draft: Draft) => ({
    name: draft.name.trim(),
    slug: draft.slug.trim().toLowerCase(),
    bio: draft.bio.trim() === '' ? null : draft.bio.trim(),
    avatarUrl: draft.avatarUrl.trim() === '' ? null : draft.avatarUrl.trim(),
    sortOrder: Number(draft.sortOrder) || 0,
  });

  const create = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/narrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromDraft(createDraft)),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Create failed');
        return;
      }
      toast.success('Narrator created');
      setCreateDraft(emptyDraft());
      void load();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/narrators/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromDraft(editDraft)),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Save failed');
        return;
      }
      toast.success('Narrator updated');
      setEditingId(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete narrator “${name}”? Story assignments will be removed.`)) {
      return;
    }
    const res = await fetch(`/api/admin/narrators/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Narrator deleted');
    void load();
  };

  const uploadAvatar = async (
    file: File,
    target: 'create' | 'edit'
  ) => {
    const fd = new FormData();
    fd.set('file', file);
    const up = await fetch('/api/upload', { method: 'POST', body: fd });
    const uj = (await up.json()) as { error?: string; fileUrl?: string };
    if (!up.ok || !uj.fileUrl) {
      toast.error(uj.error || 'Upload failed');
      return;
    }
    if (target === 'create') {
      setCreateDraft((d) => ({ ...d, avatarUrl: uj.fileUrl! }));
    } else {
      setEditDraft((d) => ({ ...d, avatarUrl: uj.fileUrl! }));
    }
    toast.success('Avatar uploaded');
  };

  const renderForm = (
    draft: Draft,
    setDraft: React.Dispatch<React.SetStateAction<Draft>>,
    onSubmit: () => void,
    submitLabel: string,
    avatarTarget: 'create' | 'edit'
  ) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Name</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          value={draft.name}
          onChange={(e) => {
            const name = e.target.value;
            setDraft((d) => ({
              ...d,
              name,
              slug: d.slug === '' || d.slug === slugFromName(d.name) ? slugFromName(name) : d.slug,
            }));
          }}
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Slug</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
          value={draft.slug}
          onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="font-semibold text-slate-700">Bio (optional)</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          rows={2}
          value={draft.bio}
          onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Sort order</span>
        <input
          type="number"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          value={draft.sortOrder}
          onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Avatar URL</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={draft.avatarUrl}
          onChange={(e) => setDraft((d) => ({ ...d, avatarUrl: e.target.value }))}
        />
        <input
          type="file"
          accept="image/*"
          className="mt-2 text-xs"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadAvatar(f, avatarTarget);
          }}
        />
      </label>
      <div className="flex items-end sm:col-span-2">
        <button
          type="button"
          disabled={saving || !draft.name.trim() || !draft.slug.trim()}
          onClick={onSubmit}
          className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Add narrator
        </h2>
        <div className="mt-4">
          {renderForm(createDraft, setCreateDraft, () => void create(), 'Create narrator', 'create')}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          All narrators ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No narrators yet.</p>
        ) : (
          rows.map((row) => {
            const editing = editingId === row.id;
            return (
              <article
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200">
                    {row.avatarUrl ? (
                      <Image
                        src={row.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-500">
                        {row.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{row.name}</h3>
                    <p className="font-mono text-xs text-slate-500">{row.slug}</p>
                    {row.bio ? (
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{row.bio}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        if (editing) {
                          setEditingId(null);
                        } else {
                          setEditingId(row.id);
                          setEditDraft(rowToDraft(row));
                        }
                      }}
                    >
                      {editing ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      onClick={() => void remove(row.id, row.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {editing ? (
                  <div className="mt-4 space-y-6 border-t border-slate-100 pt-4">
                    {renderForm(
                      editDraft,
                      setEditDraft,
                      () => void saveEdit(row.id),
                      'Save changes',
                      'edit'
                    )}
                    <NarratorStoryPicker
                      narratorId={row.id}
                      narratorName={row.name}
                    />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
