import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { customStoryNfcRequestSchema } from '@/lib/custom-stories/schemas';
import { serializeCustomStoryOrder } from '@/lib/custom-stories/serializers';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = customStoryNfcRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }
  const order = await prisma.customStoryOrder.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await prisma.customStoryOrder.update({
    where: { id },
    data: { nfcRequested: parsed.data.requested },
  });
  return NextResponse.json({ ok: true, order: serializeCustomStoryOrder(updated) });
}
