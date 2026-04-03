'use client';

export default function StoryEditorHeader({
  title,
  dirty,
  saving,
  saveError,
  saveSuccess,
  onSave,
  onCancel,
  onReset,
  disabled,
}: {
  title: string;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 sm:text-xl">
            {title}
          </h2>
          <p className="text-xs text-slate-500">
            {dirty ? (
              <span className="font-semibold text-amber-700">
                Unsaved changes
              </span>
            ) : (
              <span>All changes saved</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={disabled || saving || !dirty}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled || saving || !dirty}
            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || saving || !dirty}
            className="rounded-full bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/25 hover:bg-rose-600 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
      {saveError ? (
        <p className="mt-2 text-xs font-medium text-rose-600" role="alert">
          {saveError}
        </p>
      ) : null}
      {saveSuccess ? (
        <p className="mt-2 text-xs font-medium text-emerald-600" role="status">
          Saved successfully.
        </p>
      ) : null}
    </div>
  );
}
