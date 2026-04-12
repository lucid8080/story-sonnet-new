'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  /** Element to restore focus after close (e.g. the “Read more” control). */
  returnFocusRef: MutableRefObject<HTMLElement | null>;
};

export function EpisodeDescriptionModal({
  open,
  title,
  description,
  onClose,
  returnFocusRef,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => {
      onClose();
      const node = returnFocusRef.current;
      returnFocusRef.current = null;
      queueMicrotask(() => node?.focus?.());
    };
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose, returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      className="m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 text-slate-800 shadow-none [&::backdrop]:bg-slate-900/40"
      aria-labelledby="episode-desc-modal-title"
    >
      <div
        className="flex min-h-full items-center justify-center p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            dialogRef.current?.close();
          }
        }}
      >
        <div className="flex max-h-[min(85vh,32rem)] w-[min(100vw-2rem,28rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2
              id="episode-desc-modal-title"
              className="min-w-0 text-lg font-black leading-snug text-slate-900"
            >
              {title}
            </h2>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              aria-label="Close episode description"
              onClick={() => dialogRef.current?.close()}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-600">
            <p className="whitespace-pre-wrap">{description}</p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
