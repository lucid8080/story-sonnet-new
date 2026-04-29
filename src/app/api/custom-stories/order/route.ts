import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCustomStoryOrderSchema } from '@/lib/custom-stories/schemas';
import { createCustomStoryOrder } from '@/lib/custom-stories/service';
import { serializeCustomStoryOrder } from '@/lib/custom-stories/serializers';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createCustomStoryOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const order = await createCustomStoryOrder(session.user.id, parsed.data);
    return NextResponse.json({ ok: true, order: serializeCustomStoryOrder(order) });
  } catch (e) {
    console.error('[custom-stories/order]', e);
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
  }
}
