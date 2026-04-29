import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { generateCustomStoryFromOrder } from '@/lib/custom-stories/service';
import { CUSTOM_STORY_STATUS } from '@/lib/custom-stories/config';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await context.params;

  const order = await prisma.customStoryOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const isOwner = !!session?.user?.id && session.user.id === order.userId;
  const isAdmin = session?.user?.role === 'admin';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (order.status === CUSTOM_STORY_STATUS.COMPLETED && order.storyId) {
    return NextResponse.json({ ok: true, storyId: order.storyId.toString(), alreadyCompleted: true });
  }

  try {
    const generated = await generateCustomStoryFromOrder(order);
    return NextResponse.json({ ok: true, storyId: generated.storyId.toString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
