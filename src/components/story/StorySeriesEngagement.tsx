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
import { Bookmark, Heart, Loader2, MessageCircle } from 'lucide-react';
import { COMMENT_MAX } from '@/lib/storyEngagementApi';

export type EngagementComment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorImage: string | null;
};

type EngagementPayload = {
  likeCount: number;
  likedByMe: boolean;
  inLibrary: boolean;
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
  comments: EngagementComment[];
  likeBusy: boolean;
  libraryBusy: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  commentBusy: boolean;
  commentError: string | null;
  toggleLike: () => Promise<void>;
  toggleLibrary: () => Promise<void>;
  submitComment: (e: React.FormEvent) => Promise<void>;
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
  const [comments, setComments] = useState<EngagementComment[]>([]);
  const [likeBusy, setLikeBusy] = useState(false);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

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
      comments,
      likeBusy,
      libraryBusy,
      commentText,
      setCommentText,
      commentBusy,
      commentError,
      toggleLike,
      toggleLibrary,
      submitComment,
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
      comments,
      likeBusy,
      libraryBusy,
      commentText,
      commentBusy,
      commentError,
      toggleLike,
      toggleLibrary,
      submitComment,
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
    likeCount,
    likedByMe,
    inLibrary,
    likeBusy,
    libraryBusy,
    toggleLike,
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
            to like this series, save it to your library, and leave a comment
            below.
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
              onClick={() => void toggleLike()}
              disabled={likeBusy}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                likedByMe
                  ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              aria-pressed={likedByMe}
            >
              {likeBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Heart
                  className={`h-4 w-4 ${likedByMe ? 'fill-current' : ''}`}
                  aria-hidden
                />
              )}
              Like
              <span className="font-mono text-xs opacity-80">{likeCount}</span>
            </button>
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

/** Comments — below cover + episodes (full width under main grid). */
export function StorySeriesCommentsPanel({
  className = '',
}: {
  className?: string;
}) {
  const {
    storySlug,
    loggedIn,
    comments,
    commentText,
    setCommentText,
    commentBusy,
    commentError,
    submitComment,
  } = useStoryEngagement();

  return (
    <div
      className={`rounded-[1.6rem] bg-white p-5 shadow-lg ring-1 ring-slate-100 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2 text-slate-800">
        <MessageCircle className="h-5 w-5 text-violet-500" aria-hidden />
        <h2 className="text-lg font-black text-slate-900">Comments</h2>
      </div>

      {loggedIn ? (
        <form onSubmit={submitComment} className="mb-5">
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
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
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
                    <time
                      dateTime={c.createdAt}
                      className="text-xs text-slate-400"
                    >
                      {new Date(c.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {c.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
