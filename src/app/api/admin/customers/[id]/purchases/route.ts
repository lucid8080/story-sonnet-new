import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;

  try {
    const purchases = await prisma.customerPurchase.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      ok: true,
      data: {
        purchases: purchases.map((p) => ({
          id: p.id,
          amountCents: p.amountCents,
          currency: p.currency,
          status: p.status,
          productType: p.productType,
          provider: p.provider,
          providerRef: p.providerRef,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/customers/[id]/purchases]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
