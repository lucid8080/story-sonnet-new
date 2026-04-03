import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import AdminRoute from '../../components/auth/AdminRoute.jsx';
import { fetchStories, updateStoryMeta } from '../../lib/api/stories.js';

export default function AdminStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState({});
  const [savingById, setSavingById] = useState({});
  const [saveErrorById, setSaveErrorById] = useState({});

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStories();
        if (!ignore) setStories(data || []);
      } catch (err) {
        if (!ignore) {
          setError(err);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const startEditing = (story) => {
    setEditing((prev) => ({
      ...prev,
      [story.slug]: {
        title: story.title,
        isPublished: !!story.isPublished,
        isPremium: !!story.isPremium,
      },
    }));
    setSaveErrorById((prev) => {
      const next = { ...prev };
      if (story.id in next) delete next[story.id];
      return next;
    });
  };

  const cancelEditing = (story) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[story.slug];
      return next;
    });
    setSaveErrorById((prev) => {
      const next = { ...prev };
      if (story.id in next) delete next[story.id];
      return next;
    });
  };

  const handleFieldChange = (slug, field, value) => {
    setEditing((prev) => ({
      ...prev,
      [slug]: {
        ...(prev[slug] || {}),
        [field]: value,
      },
    }));
  };

  const handleSave = async (story) => {
    const edit = editing[story.slug];
    if (!edit || !story.id) return;

    setSavingById((prev) => ({ ...prev, [story.id]: true }));
    setSaveErrorById((prev) => {
      const next = { ...prev };
      if (story.id in next) delete next[story.id];
      return next;
    });

    try {
      const { error } = await updateStoryMeta({
        id: story.id,
        title: edit.title,
        is_published: edit.isPublished,
        is_premium: edit.isPremium,
      });

      if (error) {
        setSaveErrorById((prev) => ({
          ...prev,
          [story.id]: error.message || 'Failed to save changes.',
        }));
        return;
      }

      setStories((prev) =>
        prev.map((s) =>
          s.slug === story.slug
            ? {
                ...s,
                title: edit.title,
                isPublished: edit.isPublished,
                isPremium: edit.isPremium,
              }
            : s
        )
      );

      cancelEditing(story);
    } catch (err) {
      setSaveErrorById((prev) => ({
        ...prev,
        [story.id]: err.message || 'Unexpected error while saving.',
      }));
    } finally {
      setSavingById((prev) => {
        const next = { ...prev };
        delete next[story.id];
        return next;
      });
    }
  };

  const renderStatusBadge = (on, onLabel, offLabel, onClick) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
        on
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {on ? onLabel : offLabel}
    </button>
  );

  const getEditState = (story) => editing[story.slug] || null;

  return (
    <AdminRoute>
      <AdminLayout>
        <h2 className="text-lg font-black text-slate-900">Stories</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage your story series. Edit titles, toggle premium and publish status, and drill into a
          series to see its episodes.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          {loading && (
            <div className="flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-6 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
              Loading stories…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <div className="font-semibold uppercase tracking-[0.18em]">Error loading stories</div>
              <p className="mt-1">
                Something went wrong while fetching stories. Check the browser console for full
                details.
              </p>
              {error?.message && (
                <p className="mt-1 break-all text-[11px] text-rose-700">
                  {error.message}
                </p>
              )}
            </div>
          )}

          {!loading && !error && stories.length === 0 && (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-xs text-slate-500 ring-1 ring-dashed ring-slate-200">
              <div className="font-semibold uppercase tracking-[0.18em] text-slate-600">
                No stories found
              </div>
              <p className="mt-1">
                There are currently no stories in Supabase or the static seed data. Add a story in
                the database or seed file, then refresh this page.
              </p>
            </div>
          )}

          {!loading && !error && stories.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <th className="py-2 pr-4">Series</th>
                    <th className="py-2 pr-4">Story title</th>
                    <th className="py-2 pr-4">Age</th>
                    <th className="py-2 pr-4">Duration</th>
                    <th className="py-2 pr-4">Episodes</th>
                    <th className="py-2 pr-4">Published</th>
                    <th className="py-2 pr-4">Premium</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {stories.map((story) => {
                    const edit = getEditState(story);
                    const isSaving = !!savingById[story.id];
                    const saveError = saveErrorById[story.id];

                    return (
                      <tr
                        key={story.slug}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
                      >
                        <td className="py-2 pr-4">
                          <div className="font-semibold text-slate-900">
                            <Link
                              to={`/admin/stories/${story.slug}`}
                              className="hover:underline"
                            >
                              {story.seriesTitle}
                            </Link>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">{story.slug}</div>
                        </td>
                        <td className="py-2 pr-4">
                          {edit ? (
                            <input
                              type="text"
                              value={edit.title}
                              onChange={(e) =>
                                handleFieldChange(story.slug, 'title', e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[13px] font-medium text-slate-800 outline-none ring-0 focus:border-slate-400"
                            />
                          ) : (
                            <div className="text-[13px] font-medium text-slate-800">
                              {story.title}
                            </div>
                          )}
                          {story.summary && (
                            <div className="mt-0.5 line-clamp-2 max-w-xs text-[11px] text-slate-500">
                              {story.summary}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-slate-600">
                          {story.ageGroup || '—'}
                        </td>
                        <td className="py-2 pr-4 text-slate-600">
                          {story.averageDurationLabel || story.durationLabel || '—'}
                        </td>
                        <td className="py-2 pr-4 text-slate-600">
                          {Array.isArray(story.episodes) ? story.episodes.length : 0}
                        </td>
                        <td className="py-2 pr-4">
                          {renderStatusBadge(
                            edit ? edit.isPublished : story.isPublished,
                            'Published',
                            'Draft',
                            () =>
                              handleFieldChange(
                                story.slug,
                                'isPublished',
                                !(edit ? edit.isPublished : story.isPublished)
                              )
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {renderStatusBadge(
                            edit ? edit.isPremium : story.isPremium,
                            'Premium',
                            'Free',
                            () =>
                              handleFieldChange(
                                story.slug,
                                'isPremium',
                                !(edit ? edit.isPremium : story.isPremium)
                              )
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right align-top">
                          <div className="flex flex-col items-end gap-1">
                            {!edit ? (
                              <button
                                type="button"
                                onClick={() => startEditing(story)}
                                className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-50"
                              >
                                Edit
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSave(story)}
                                  disabled={isSaving}
                                  className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50 disabled:opacity-60"
                                >
                                  {isSaving ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelEditing(story)}
                                  disabled={isSaving}
                                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            {saveError && (
                              <div className="max-w-xs text-[10px] text-rose-700">
                                {saveError}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}

