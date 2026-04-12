export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
      {hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
