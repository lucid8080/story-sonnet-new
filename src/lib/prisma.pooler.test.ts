import { describe, expect, it } from 'vitest';
import { databaseUrlWithPoolerCompat } from '@/lib/prisma';

describe('databaseUrlWithPoolerCompat', () => {
  it('adds pgbouncer=true for Neon pooler hosts', () => {
    const url =
      'postgresql://u:p@ep-foo-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
    const out = databaseUrlWithPoolerCompat(url)!;
    expect(out).toContain('pgbouncer=true');
  });

  it('does not duplicate pgbouncer param', () => {
    const url =
      'postgresql://u:p@ep-foo-pooler.neon.tech/db?sslmode=require&pgbouncer=true';
    const out = databaseUrlWithPoolerCompat(url)!;
    expect(out.match(/pgbouncer=/g)?.length).toBe(1);
  });

  it('leaves direct Neon URLs unchanged', () => {
    const url =
      'postgresql://u:p@ep-foo.us-east-2.aws.neon.tech/neondb?sslmode=require';
    expect(databaseUrlWithPoolerCompat(url)).toBe(url);
  });
});
