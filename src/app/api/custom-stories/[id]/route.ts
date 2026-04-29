import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCustomStoryOrderForUser } from '@/lib/custom-stories/service';
import { serializeCustomStoryOrder } from '@/lib/custom-stories/serializers';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateVisibilitySchema = z.object({
  visibility: z.enum(['public', 'private']),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  const order = await getCustomStoryOrderForUser(id, session.user.id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, order: serializeCustomStoryOrder(order) });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = updateVisibilitySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 });
  }

  const { id } = await context.params;
  const order = await prisma.customStoryOrder.findUnique({
    where: { id },
    select: { id: true, userId: true, storyId: true },
  });
  if (!order || !order.storyId) {
    return NextResponse.json({ error: 'Order story not found' }, { status: 404 });
  }
  if (order.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const story = await prisma.story.update({
    where: { id: order.storyId },
    data: { access: parsed.data.visibility, isUserGenerated: true, ownerUserId: order.userId },
    select: { access: true },
  });

  return NextResponse.json({ ok: true, visibility: story.access });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const order = await prisma.customStoryOrder.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.customStoryOrder.delete({
    where: { id: order.id },
  });

  return NextResponse.json({ ok: true });
}
