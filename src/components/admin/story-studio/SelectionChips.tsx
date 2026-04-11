'use client';

import clsx from 'clsx';

type Option = { id: string; label: string };

export function SelectionChips(props: {
  label: string;
  options: readonly Option[];
  value: string;
  onChange: (id: string) => void;
  columns?: 2 | 3 | 4;
}) {
  const col =
    props.columns === 4
      ? 'sm:grid-cols-4'
      : props.columns === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2';

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {props.label}
      </p>
      <div className={clsx('grid grid-cols-2 gap-2', col)}>
        {props.options.map((o) => {
          const on = o.id === props.value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => props.onChange(o.id)}
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
