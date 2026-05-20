import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Neon pooled URLs need `pgbouncer=true` so Prisma disables prepared statements.
 * Without it, Postgres can throw "cached plan must not change result type" after schema changes.
 */
export function databaseUrlWithPoolerCompat(
  url: string | undefined
): string | undefined {
  if (!url?.trim()) return url;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isNeonPooler =
      host.includes('-pooler') || host.includes('.pooler.');
    if (isNeonPooler && !parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const datasourceUrl = databaseUrlWithPoolerCompat(process.env.DATABASE_URL);

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
