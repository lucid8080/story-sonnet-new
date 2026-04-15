'use client';

import clsx from 'clsx';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

type Option = { id: string; label: string };

export function SelectionChips(props: {
  label: string;
  options: readonly Option[];
  value: string;
  onChange: (id: string) => void;
  columns?: 2 | 3 | 4;
  muted?: boolean;
  toggleChecked?: boolean;
  onToggleChange?: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const triggerId = useId();

  const col =
    props.columns === 4
      ? 'sm:grid-cols-4'
      : props.columns === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2';
  const selected = useMemo(
    () => props.options.find((o) => o.id === props.value),
    [props.options, props.value]
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const insideTrigger = triggerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      className={clsx(
        'relative space-y-2 rounded-xl p-1 transition',
        props.muted ? 'bg-slate-50/80 opacity-70' : ''
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {props.label}
      </p>
      <div className="flex items-center gap-2">
        <button
          id={triggerId}
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((s) => !s)}
          className={clsx(
            'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium transition',
            open
              ? 'border-violet-400 bg-violet-50 text-violet-950 shadow-sm'
              : 'border-slate-200 bg-white text-slate-800 hover:border-violet-200'
          )}
        >
          <span className="truncate">{selected?.label ?? 'Select option'}</span>
          <span className="ml-3 shrink-0 text-xs text-slate-500">
            {open ? 'Close' : 'Choose'}
          </span>
        </button>
        {props.onToggleChange && typeof props.toggleChecked === 'boolean' && (
          <input
            type="checkbox"
            aria-label={`${props.label} preset toggle`}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-violet-600"
            checked={props.toggleChecked}
            onChange={(e) => props.onToggleChange?.(e.target.checked)}
          />
        )}
      </div>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby={triggerId}
          className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
        >
          <div className={clsx('grid grid-cols-2 gap-2', col)}>
            {props.options.map((o) => {
              const on = o.id === props.value;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    props.onChange(o.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={clsx(
                    'rounded-xl border px-3 py-2 text-left text-sm font-medium transition',
                    on
                      ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200'
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToggleRow(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-800">{props.label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-violet-600"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
    </label>
  );
}
