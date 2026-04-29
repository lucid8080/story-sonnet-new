import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listCustomStoryOrdersForUser } from '@/lib/custom-stories/service';
import { serializeCustomStoryOrder } from '@/lib/custom-stories/serializers';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rows = await listCustomStoryOrdersForUser(session.user.id);
  return NextResponse.json({ ok: true, orders: rows.map(serializeCustomStoryOrder) });
}
