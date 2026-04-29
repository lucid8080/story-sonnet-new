import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const rows = await prisma.customStoryOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, name: true } },
      story: { select: { id: true, slug: true, seriesTitle: true } },
    },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    orders: rows.map((row) => ({
      ...row,
      storyId: row.storyId ? row.storyId.toString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      paidAt: row.paidAt?.toISOString() ?? null,
      nfcFulfilledAt: row.nfcFulfilledAt?.toISOString() ?? null,
    })),
  });
}
