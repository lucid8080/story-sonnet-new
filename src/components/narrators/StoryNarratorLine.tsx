import Link from 'next/link';
import type { StoryNarratorRef } from '@/lib/narrators';

function narratorSeparator(index: number, total: number): string {
  if (index === 0) return '';
  if (index === total - 1) return total === 2 ? ' and ' : ', and ';
  return ', ';
}

export function StoryNarratorLine({
  narrators,
}: {
  narrators: StoryNarratorRef[];
}) {
  if (!narrators.length) return null;

  const linkClass =
    'font-semibold text-violet-700 hover:text-violet-900 hover:underline';

  return (
    <p className="text-sm text-slate-700">
      <span className="font-semibold text-slate-700">Narrator: </span>
      {narrators.map((n, index) => (
        <span key={n.id}>
          {narratorSeparator(index, narrators.length)}
          <Link
            href={`/narrators?narrator=${encodeURIComponent(n.slug)}`}
            className={linkClass}
          >
            {n.name}
          </Link>
        </span>
      ))}
    </p>
  );
}
