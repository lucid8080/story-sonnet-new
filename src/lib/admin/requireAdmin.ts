import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '@/auth';

export async function requireAdmin(): Promise<
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
