import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { generateCustomStoryFromOrder } from '@/lib/custom-stories/service';
import { PREPURCHASE_IDEA_PLACEHOLDER } from '@/lib/custom-stories/service';
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
  if (
    order.status !== CUSTOM_STORY_STATUS.PAID &&
    order.status !== CUSTOM_STORY_STATUS.GENERATING &&
    order.status !== CUSTOM_STORY_STATUS.COMPLETED
  ) {
    return NextResponse.json(
      { error: 'Payment is required before generation can start.' },
      { status: 409 }
    );
  }
  const simpleIdea = String(
    ((order.inputs ?? {}) as { simpleIdea?: unknown }).simpleIdea ?? ''
  ).trim();
  if (!simpleIdea || simpleIdea === PREPURCHASE_IDEA_PLACEHOLDER) {
    return NextResponse.json(
      { error: 'Please add your simple idea before generating your story.' },
      { status: 409 }
    );
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
