import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createCustomStoryOrderSchema,
  createCustomStoryPrepurchaseOrderSchema,
} from '@/lib/custom-stories/schemas';
import {
  createCustomStoryOrder,
  createCustomStoryPrepurchaseOrder,
} from '@/lib/custom-stories/service';
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
  const fullOrder = createCustomStoryOrderSchema.safeParse(body);
  const prepurchaseOrder = createCustomStoryPrepurchaseOrderSchema.safeParse(body);
  if (!fullOrder.success && !prepurchaseOrder.success) {
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 400 }
    );
  }
  try {
    const order = fullOrder.success
      ? await createCustomStoryOrder(session.user.id, fullOrder.data)
      : await createCustomStoryPrepurchaseOrder(session.user.id, prepurchaseOrder.data);
    return NextResponse.json({ ok: true, order: serializeCustomStoryOrder(order) });
  } catch (e) {
    console.error('[custom-stories/order]', e);
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
  }
}
