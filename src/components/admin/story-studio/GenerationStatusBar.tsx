'use client';

type Job = {
  id: string;
  step: string;
  status: string;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export function GenerationStatusBar(props: { jobs: Job[]; busy?: boolean }) {
  const latest = props.jobs[0];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        {props.busy && (
          <span className="inline-flex items-center gap-2 font-semibold text-violet-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
            Generating…
          </span>
        )}
        {latest && !props.busy && (
          <span className="text-slate-700">
            Last job:{' '}
            <span className="font-mono font-semibold">{latest.step}</span>{' '}
            <span
              className={
                latest.status === 'succeeded'
                  ? 'text-emerald-600'
                  : latest.status === 'failed'
                    ? 'text-red-600'
                    : 'text-amber-600'
              }
            >
              {latest.status}
            </span>
            {latest.errorMessage && (
              <span className="ml-2 text-red-600" title={latest.errorMessage}>
                — {latest.errorMessage.slice(0, 120)}
                {latest.errorMessage.length > 120 ? '…' : ''}
              </span>
            )}
          </span>
        )}
        {!latest && !props.busy && (
          <span className="text-slate-500">No generation runs yet.</span>
        )}
      </div>
    </div>
  );
}
