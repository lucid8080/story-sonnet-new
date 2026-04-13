/** JSON body for 503 when the DB is behind Prisma (e.g. pending migrations). */
export const SPOTLIGHT_SCHEMA_MISMATCH_JSON = {
  error:
    'Database schema is behind this app (missing content calendar columns such as badge_corner).',
  hint: 'Apply migrations: npm run db:migrate. On Neon, set DIRECT_DATABASE_URL to the non-pooler connection string (not the -pooler host) so migrate does not time out (P1002).',
  code: 'SCHEMA_DRIFT',
} as const;
