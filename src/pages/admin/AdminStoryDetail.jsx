import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import AdminRoute from '../../components/auth/AdminRoute.jsx';
import { fetchStoryBySlug } from '../../lib/api/stories.js';

export default function AdminStoryDetail() {
  const { slug } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStoryBySlug(slug);
        if (!ignore) {
          setStory(data);
        }
      } catch (err) {
        if (!ignore) setError(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [slug]);

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">Story detail</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review episodes for this series. Editing episodes can be added later.
            </p>
          </div>
          <Link
            to="/admin/stories"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700"
          >
            Back to stories
          </Link>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          {loading && (
            <div className="flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-6 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
              Loading story…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <div className="font-semibold uppercase tracking-[0.18em]">Error loading story</div>
              <p className="mt-1">
                Something went wrong while fetching this story. Check the browser console for full
                details.
              </p>
              {error?.message && (
                <p className="mt-1 break-all text-[11px] text-rose-700">
                  {error.message}
                </p>
              )}
            </div>
          )}

          {!loading && !error && !story && (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-xs text-slate-500 ring-1 ring-slate-100">
              Story not found for slug <span className="font-mono text-slate-700">{slug}</span>.
            </div>
          )}

          {!loading && !error && story && (
            <>
              <div className="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Series
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {story.seriesTitle}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Story title: <span className="font-medium text-slate-900">{story.title}</span>
                </div>
                {story.summary && (
                  <p className="mt-2 text-sm text-slate-600">
                    {story.summary}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Episodes
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {story.episodes?.length || 0} total
                    </p>
                  </div>
                </div>

                <div className="max-h-[420px] space-y-2 overflow-y-auto text-xs">
                  {story.episodes && story.episodes.length > 0 ? (
                    story.episodes.map((ep, index) => (
                      <div
                        key={ep.id || index}
                        className="flex items-start justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-100"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {ep.label}
                          </div>
                          <div className="mt-0.5 text-sm font-semibold text-slate-900">
                            {ep.title}
                          </div>
                          {ep.description && (
                            <div className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                              {ep.description}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-50">
                            {ep.duration || '—'}
                          </div>
                          <div className="flex gap-1">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${
                                ep.isPublished
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {ep.isPublished ? 'Published' : 'Draft'}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${
                                ep.isPremium
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {ep.isPremium ? 'Premium' : 'Free'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      No episodes found for this story.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}

