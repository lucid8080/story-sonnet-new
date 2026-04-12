import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { auditListQuerySchema } from '@/lib/validation/customerSchemas';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const url = new URL(req.url);
  const parsed = auditListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, pageSize } = parsed.data;
  const skip = (page - 1) * pageSize;

  try {
    const [total, rows] = await Promise.all([
      prisma.customerAuditLog.count({ where: { userId: id } }),
      prisma.customerAuditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          actorAdmin: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        page,
        pageSize,
        total,
        entries: rows.map((r) => ({
          id: r.id,
          actionType: r.actionType,
          reason: r.reason,
          metadata: r.metadata,
          createdAt: r.createdAt.toISOString(),
          actor: r.actorAdmin,
        })),
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/customers/[id]/audit]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
