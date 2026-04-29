import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await context.params;

  const row = await prisma.customStoryOrder.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });

  const updated = await prisma.customStoryOrder.update({
    where: { id },
    data: { nfcFulfilledAt: row.nfcFulfilledAt ? null : new Date() },
  });

  return NextResponse.json({
    ok: true,
    order: {
      ...updated,
      storyId: updated.storyId ? updated.storyId.toString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      paidAt: updated.paidAt?.toISOString() ?? null,
      nfcFulfilledAt: updated.nfcFulfilledAt?.toISOString() ?? null,
    },
  });
}
