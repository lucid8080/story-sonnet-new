'use client';

import clsx from 'clsx';

const TABS = [
  { id: 'brief', label: 'Story Brief' },
  { id: 'script', label: 'Script' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'cover', label: 'Cover Art' },
  { id: 'music', label: 'Music' },
  { id: 'audio', label: 'Audio' },
  { id: 'publish', label: 'Publish mapping' },
] as const;

export type PreviewTabId = (typeof TABS)[number]['id'];

export function PreviewTabs(props: {
  active: PreviewTabId;
  onChange: (id: PreviewTabId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => props.onChange(t.id)}
          className={clsx(
            'rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm',
            props.active === t.id
              ? 'bg-white text-violet-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
