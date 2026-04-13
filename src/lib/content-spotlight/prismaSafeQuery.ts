import { Prisma } from '@prisma/client';

/**
 * True when the DB has not had Content Calendar migrations applied yet
 * (or the spotlight table was dropped), or when the DB is behind the Prisma
 * schema (e.g. new column not migrated). Avoids 500s on public pages during rollout.
 */
export function isMissingContentSpotlightSchemaError(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return false;

  // Prisma client expects a column that does not exist yet (run `migrate deploy`).
  if (e.code === 'P2022') {
    const meta = e.meta as { column?: unknown } | undefined;
    const colBlob = `${JSON.stringify(meta)} ${e.message}`.toLowerCase();
    return colBlob.includes('badge_corner');
  }

  if (e.code !== 'P2021') return false;
  const meta = e.meta as { table?: string; modelName?: string } | undefined;
  const table = String(meta?.table ?? '');
  const model = String(meta?.modelName ?? '');
  const blob = `${table} ${model} ${e.message}`.toLowerCase();
  return (
    blob.includes('content_spotlight') ||
    blob.includes('badge_asset') ||
    blob.includes('content_calendar_setting')
  );
}
