'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { Bookmark, Loader2, MessageCircle, Star } from 'lucide-react';
import { COMMENT_MAX } from '@/lib/storyEngagementApi';

export type EngagementComment = {
  id: string;
  authorId: string;
  authorRating: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorImage: string | null;
};

type EngagementPayload = {
  likeCount: number;
  likedByMe: boolean;
  inLibrary: boolean;
  ratingAverage: number | null;
  ratingCount: number;
  myRating: number | null;
  comments: EngagementComment[];
};

function apiPath(slug: string, sub: string) {
  return `/api/stories/${encodeURIComponent(slug)}/${sub}`;
}

type EngagementContextValue = {
  storySlug: string;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  loggedIn: boolean;
  loginHref: string;
  loading: boolean;
  error: string | null;
  likeCount: number;
  likedByMe: boolean;
  inLibrary: boolean;
  ratingAverage: number | null;
  ratingCount: number;
  myRating: number | null;
  comments: EngagementComment[];
  likeBusy: boolean;
  libraryBusy: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  commentBusy: boolean;
  commentError: string | null;
  ratingBusy: boolean;
  ratingError: string | null;
  toggleLike: () => Promise<void>;
  toggleLibrary: () => Promise<void>;
  setMyRating: (rating: number) => Promise<void>;
  clearMyRating: () => Promise<void>;
  submitComment: (e: React.FormEvent) => Promise<void>;
  updateComment: (commentId: string, body: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
};

const StoryEngagementContext = createContext<EngagementContextValue | null>(
  null
);

function useStoryEngagement(): EngagementContextValue {
  const ctx = useContext(StoryEngagementContext);
  if (!ctx) {
    throw new Error(
      'Story engagement components require StoryEngagementProvider'
    );
  }
  return ctx;
}

export function StoryEngagementProvider({
  storySlug,
  children,
}: {
  storySlug: string;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  const [ratingAverage, setRatingAverage] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [myRating, setMyRatingState] = useState<number | null>(null);
  const [comments, setComments] = useState<EngagementComment[]>([]);
  const [likeBusy, setLikeBusy] = useState(false);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  const loggedIn = status === 'authenticated' && !!session?.user;
  const callbackUrl = `/story/${encodeURIComponent(storySlug)}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const loadEngagement = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath(storySlug, 'engagement'), {
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as EngagementPayload & {
        error?: string;
        debug?: string;
      };
      if (!res.ok) {
        setError(
          data.error
            ? `${data.error}${data.debug ? ` (${data.debug})` : ''}`
            : 'Could not load engagement.'
        );
        return;
      }
      setLikeCount(data.likeCount ?? 0);
      setLikedByMe(!!data.likedByMe);
      setInLibrary(!!data.inLibrary);
      setRatingAverage(
        typeof data.ratingAverage === 'number' ? data.ratingAverage : null
      );
      setRatingCount(typeof data.ratingCount === 'number' ? data.ratingCount : 0);
      setMyRatingState(typeof data.myRating === 'number' ? data.myRating : null);
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load engagement.');
    } finally {
      setLoading(false);
    }
  }, [storySlug]);

  useEffect(() => {
    void loadEngagement();
  }, [loadEngagement]);

  const toggleLike = useCallback(async () => {
    if (!loggedIn || likeBusy) return;
    const nextLiked = !likedByMe;
    setLikeBusy(true);
    setLikedByMe(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    try {
      const res = await fetch(apiPath(storySlug, 'like'), {
        method: nextLiked ? 'POST' : 'DELETE',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as {
        likeCount?: number;
        likedByMe?: boolean;
        error?: string;
        debug?: string;
      };
      if (!res.ok) {
        setLikedByMe(!nextLiked);
        setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
        setError(
          data.error
            ? `${data.error}${data.debug ? ` (${data.debug})` : ''}`
            : 'Like failed.'
        );
        return;
      }
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
      if (typeof data.likedByMe === 'boolean') setLikedByMe(data.likedByMe);
    } catch {
      setLikedByMe(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
      setError('Like failed (network).');
    } finally {
      setLikeBusy(false);
    }
  }, [likeBusy, likedByMe, loggedIn, storySlug]);

  const toggleLibrary = useCallback(async () => {
    if (!loggedIn || libraryBusy) return;
    const next = !inLibrary;
    setLibraryBusy(true);
    setInLibrary(next);
    try {
      const res = await fetch(apiPath(storySlug, 'library'), {
        method: next ? 'POST' : 'DELETE',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as {
        inLibrary?: boolean;
        error?: string;
        debug?: string;
      };
      if (!res.ok) {
        setInLibrary(!next);
        setError(
          data.error
            ? `${data.error}${data.debug ? ` (${data.debug})` : ''}`
            : 'Library update failed.'
        );
        return;
      }
      if (typeof data.inLibrary === 'boolean') setInLibrary(data.inLibrary);
    } catch {
      setInLibrary(!next);
      setError('Library update failed (network).');
    } finally {
      setLibraryBusy(false);
    }
  }, [inLibrary, libraryBusy, loggedIn, storySlug]);

  const setMyRating = useCallback(
    async (rating: number) => {
      if (!loggedIn || ratingBusy) return;
      setRatingBusy(true);
      setRatingError(null);
      try {
        const res = await fetch(apiPath(storySlug, 'rating'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ rating }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          myRating?: number | null;
          ratingAverage?: number | null;
          ratingCount?: number;
          error?: string;
          debug?: string;
        };
        if (!res.ok) {
          setRatingError(
            data.error
              ? `${data.error}${data.debug ? ` (${data.debug})` : ''}`
              : 'Could not save rating.'
          );
          return;
        }
        setMyRatingState(typeof data.myRating === 'number' ? data.myRating : null);
        setRatingAverage(
          typeof data.ratingAverage === 'number' ? data.ratingAverage : null
        );
        setRatingCount(typeof data.ratingCount === 'number' ? data.ratingCount : 0);
      } catch {
        setRatingError('Could not save rating (network).');
      } finally {
        setRatingBusy(false);
      }
    },
    [loggedIn, ratingBusy, storySlug]
  );

  const clearMyRating = useCallback(async () => {
    if (!loggedIn || ratingBusy) return;
    setRatingBusy(true);
    setRatingError(null);
    try {
      const res = await fetch(apiPath(storySlug, 'rating'), {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as {
        myRating?: number | null;
        ratingAverage?: number | null;
        ratingCount?: number;
        error?: string;
        debug?: string;
      };
      if (!res.ok) {
        setRatingError(
          data.error
            ? `${data.error}${data.debug ? ` (${data.debug})` : ''}`
            : 'Could not clear rating.'
        );
        return;
      }
      setMyRatingState(null);
      setRatingAverage(
        typeof data.ratingAverage === 'number' ? data.ratingAverage : null
      );
      setRatingCount(typeof data.ratingCount === 'number' ? data.ratingCount : 0);
    } catch {
      setRatingError('Could not clear rating (network).');
    } finally {
      setRatingBusy(false);
    }
  }, [loggedIn, ratingBusy, storySlug]);

  const submitComment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!loggedIn || commentBusy) return;
      const trimmed = commentText.trim();
      if (!trimmed) {
        setCommentError('Write something first.');
        return;
      }
      if (trimmed.length > COMMENT_MAX) {
        setCommentError(`Max ${COMMENT_MAX} characters.`);
        return;
      }
      setCommentBusy(true);
      setCommentError(null);
      try {
        const res = await fetch(apiPath(storySlug, 'comments'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ body: trimmed }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          comment?: EngagementComment;
          error?: string;
          debug?: string;
        };
        if (!res.ok) {
          setCommentError(
            data.error
              ? `${data.error}${data.debug ? ` (${data.debug})` : ''}`
              : 'Could not post comment.'
          );
          return;
        }
        if (data.comment) {
          setComments((prev) => [data.comment!, ...prev]);
          setCommentText('');
        }
      } catch {
        setCommentError('Could not post comment (network).');
      } finally {
        setCommentBusy(false);
      }
    },
    [commentBusy, commentText, loggedIn, storySlug]
  );

  const updateComment = useCallback(
    async (commentId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error('Write something first.');
      if (trimmed.length > COMMENT_MAX) {
        throw new Error(`Max ${COMMENT_MAX} characters.`);
      }
      const res = await fetch(apiPath(storySlug, `comments/${commentId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ body: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        comment?: EngagementComment;
        error?: string;
        debug?: string;
      };
      if (!res.ok) {
        throw new Error(
          data.error
            ? `${data.error}${data.debug ? ` (${data.debug})` : ''}`
            : 'Could not update comment.'
        );
      }
      if (data.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? data.comment! : c))
        );
      }
    },
    [storySlug]
  );

  const deleteComment = useCallback(async (commentId: string) => {
    const res = await fetch(apiPath(storySlug, `comments/${commentId}`), {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => ({}))) as {
      deletedId?: string;
      error?: string;
      debug?: string;
    };
    if (!res.ok) {
      throw new Error(
        data.error
          ? `${data.error}${data.debug ? ` (${data.debug})` : ''}`
          : 'Could not delete comment.'
      );
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, [storySlug]);

  const sessionStatus: EngagementContextValue['status'] =
    status === 'loading'
      ? 'loading'
      : status === 'authenticated'
        ? 'authenticated'
        : 'unauthenticated';

  const value = useMemo(
    (): EngagementContextValue => ({
      storySlug,
      status: sessionStatus,
      loggedIn,
      loginHref,
      loading,
      error,
      likeCount,
      likedByMe,
      inLibrary,
      ratingAverage,
      ratingCount,
      myRating,
      comments,
      likeBusy,
      libraryBusy,
      commentText,
      setCommentText,
      commentBusy,
      commentError,
      ratingBusy,
      ratingError,
      toggleLike,
      toggleLibrary,
      setMyRating,
      clearMyRating,
      submitComment,
      updateComment,
      deleteComment,
    }),
    [
      storySlug,
      sessionStatus,
      loggedIn,
      loginHref,
      loading,
      error,
      likeCount,
      likedByMe,
      inLibrary,
      ratingAverage,
      ratingCount,
      myRating,
      comments,
      likeBusy,
      libraryBusy,
      commentText,
      commentBusy,
      commentError,
      ratingBusy,
      ratingError,
      toggleLike,
      toggleLibrary,
      setMyRating,
      clearMyRating,
      submitComment,
      updateComment,
      deleteComment,
    ]
  );

  return (
    <StoryEngagementContext.Provider value={value}>
      {children}
    </StoryEngagementContext.Provider>
  );
}

/** Like / library row — under series copy, before theme + episodes. */
export function StorySeriesActionsBar({ className = '' }: { className?: string }) {
  const {
    status,
    loggedIn,
    loginHref,
    loading,
    error,
    inLibrary,
    libraryBusy,
    toggleLibrary,
  } = useStoryEngagement();

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        {status === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Checking session…
          </div>
        ) : null}

        {status !== 'loading' && !loggedIn ? (
          <p className="text-sm text-slate-600">
            <Link
              href={loginHref}
              className="font-bold text-rose-600 underline-offset-2 hover:underline"
            >
              Log in
            </Link>{' '}
            to save this series to your library and leave a comment below.
          </p>
        ) : null}

        {status !== 'loading' && loggedIn && loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : null}

        {status !== 'loading' && loggedIn && !loading ? (
          <>
            <button
              type="button"
              onClick={() => void toggleLibrary()}
              disabled={libraryBusy}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                inLibrary
                  ? 'bg-sky-100 text-sky-800 ring-2 ring-sky-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              aria-pressed={inLibrary}
            >
              {libraryBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Bookmark
                  className={`h-4 w-4 ${inLibrary ? 'fill-current' : ''}`}
                  aria-hidden
                />
              )}
              {inLibrary ? 'In your library' : 'Add to library'}
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Compact add-to-library control for top-of-cover header row. */
export function StorySeriesLibraryButton({ className = '' }: { className?: string }) {
  const {
    status,
    loggedIn,
    loginHref,
    loading,
    error,
    inLibrary,
    libraryBusy,
    toggleLibrary,
  } = useStoryEngagement();

  const busy = status === 'loading' || (loggedIn && loading) || libraryBusy;
  const label =
    status === 'loading' || (loggedIn && loading)
      ? 'Loading...'
      : inLibrary
        ? 'In your library'
        : 'Add to library';

  if (!loggedIn && status !== 'loading') {
    return (
      <Link
        href={loginHref}
        className={`inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-rose-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-white ${className}`}
      >
        <Bookmark className="h-4 w-4" aria-hidden />
        Add to library
      </Link>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void toggleLibrary()}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-sm ring-1 transition ${
          inLibrary
            ? 'bg-sky-100 text-sky-800 ring-sky-200'
            : 'bg-white/90 text-slate-700 ring-slate-200 hover:bg-white'
        } ${busy ? 'cursor-not-allowed opacity-70' : ''}`}
        aria-pressed={inLibrary}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Bookmark className={`h-4 w-4 ${inLibrary ? 'fill-current' : ''}`} aria-hidden />
        )}
        {label}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Comments — below cover + episodes (full width under main grid). */
export function StorySeriesCommentsPanel({
  className = '',
}: {
  className?: string;
}) {
  const { data: session } = useSession();
  const {
    storySlug,
    loggedIn,
    loginHref,
    comments,
    ratingAverage,
    ratingCount,
    myRating,
    ratingBusy,
    ratingError,
    setMyRating,
    clearMyRating,
    commentText,
    setCommentText,
    commentBusy,
    commentError,
    submitComment,
    updateComment,
    deleteComment,
  } = useStoryEngagement();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [commentActionBusyId, setCommentActionBusyId] = useState<string | null>(
    null
  );
  const [commentActionError, setCommentActionError] = useState<string | null>(null);

  const viewerId = session?.user?.id ?? null;
  const viewerRole = session?.user?.role ?? null;
  const canModerate = viewerRole === 'admin' || viewerRole === 'moderator';

  return (
    <div
      className={`${className}`}
    >
      <div className="mb-3 flex items-center gap-2 text-slate-800">
        <MessageCircle className="h-5 w-5 text-violet-500" aria-hidden />
        <h2 className="text-lg font-black text-slate-900">Comments</h2>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-900">Rate and comment</p>
          <p className="text-xs text-slate-600">
            {ratingCount > 0 && typeof ratingAverage === 'number'
              ? `${ratingAverage.toFixed(1)} / 5 (${ratingCount} rating${ratingCount === 1 ? '' : 's'})`
              : 'No ratings yet'}
          </p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1" aria-label="Rate this story">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={!loggedIn || ratingBusy}
                onClick={() => void setMyRating(star)}
                className="rounded p-1 text-amber-500 transition hover:scale-105 disabled:opacity-60"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-5 w-5 ${(myRating ?? 0) >= star ? 'fill-current' : ''}`}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          {loggedIn && myRating ? (
            <button
              type="button"
              onClick={() => void clearMyRating()}
              disabled={ratingBusy}
              className="text-xs font-bold text-violet-700 underline underline-offset-2 disabled:opacity-60"
            >
              Clear my rating
            </button>
          ) : null}
          {!loggedIn ? (
            <Link
              href={loginHref}
              className="text-xs font-bold text-violet-700 underline underline-offset-2"
            >
              Log in to rate and comment
            </Link>
          ) : null}
        </div>
        {ratingError ? (
          <p className="mb-2 text-sm text-rose-600" role="alert">
            {ratingError}
          </p>
        ) : null}

        {loggedIn ? (
          <form onSubmit={submitComment}>
            <label htmlFor={`comment-${storySlug}`} className="sr-only">
              Add a comment
            </label>
            <textarea
              id={`comment-${storySlug}`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              maxLength={COMMENT_MAX}
              placeholder="Share a kind note about this series…"
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                {commentText.length}/{COMMENT_MAX}
              </span>
              <button
                type="submit"
                disabled={commentBusy}
                className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                {commentBusy ? 'Posting…' : 'Post comment'}
              </button>
            </div>
            {commentError ? (
              <p className="mt-2 text-sm text-rose-600" role="alert">
                {commentError}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">
          No comments yet. Be the first to say something kind.
        </p>
      ) : (
        <ul className="space-y-4" aria-live="polite">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                {c.authorImage ? (
                  <Image
                    src={c.authorImage}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-200 text-xs font-black text-violet-900"
                    aria-hidden
                  >
                    {(c.authorName || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className="font-bold text-slate-900">
                      {c.authorName}
                    </span>
                    {typeof c.authorRating === 'number' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                        {c.authorRating}/5
                      </span>
                    ) : null}
                    <time
                      dateTime={c.createdAt}
                      className="text-xs text-slate-400"
                    >
                      {new Date(c.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                    {c.updatedAt !== c.createdAt ? (
                      <span className="text-xs text-slate-400">(edited)</span>
                    ) : null}
                  </div>
                  {editingId === c.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        maxLength={COMMENT_MAX}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={commentActionBusyId === c.id}
                          className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                          onClick={async () => {
                            setCommentActionError(null);
                            setCommentActionBusyId(c.id);
                            try {
                              await updateComment(c.id, editingText);
                              setEditingId(null);
                              setEditingText('');
                            } catch (e) {
                              setCommentActionError(
                                e instanceof Error
                                  ? e.message
                                  : 'Could not update comment.'
                              );
                            } finally {
                              setCommentActionBusyId(null);
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={commentActionBusyId === c.id}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText('');
                            setCommentActionError(null);
                          }}
                        >
                          Cancel
                        </button>
                        <span className="text-xs text-slate-400">
                          {editingText.length}/{COMMENT_MAX}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {c.body}
                    </p>
                  )}
                  {viewerId && (c.authorId === viewerId || canModerate) ? (
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        disabled={commentActionBusyId === c.id}
                        className="text-xs font-bold text-violet-700 underline underline-offset-2 disabled:opacity-60"
                        onClick={() => {
                          setCommentActionError(null);
                          setEditingId(c.id);
                          setEditingText(c.body);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={commentActionBusyId === c.id}
                        className="text-xs font-bold text-rose-700 underline underline-offset-2 disabled:opacity-60"
                        onClick={async () => {
                          setCommentActionError(null);
                          setCommentActionBusyId(c.id);
                          try {
                            await deleteComment(c.id);
                            if (editingId === c.id) {
                              setEditingId(null);
                              setEditingText('');
                            }
                          } catch (e) {
                            setCommentActionError(
                              e instanceof Error
                                ? e.message
                                : 'Could not delete comment.'
                            );
                          } finally {
                            setCommentActionBusyId(null);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {commentActionError ? (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {commentActionError}
        </p>
      ) : null}
    </div>
  );
}
