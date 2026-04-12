'use client';

import { useEffect, useRef } from 'react';

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (el) el.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
      >
        <h2 id="confirm-title" className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <div className="mt-3 text-sm text-slate-600">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={
              danger
                ? 'rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700'
                : 'rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700'
            }
            onClick={() => {
              void Promise.resolve(onConfirm());
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
