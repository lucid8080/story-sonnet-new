import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  CUSTOMER_AUDIT_ACTIONS,
  recordCustomerAudit,
} from '@/lib/admin/customers/audit';
import {
  customerNoteBodySchema,
  notesListQuerySchema,
} from '@/lib/validation/customerSchemas';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const url = new URL(req.url);
  const parsed = notesListQuerySchema.safeParse(
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
    const [total, notes] = await Promise.all([
      prisma.customerAdminNote.count({ where: { userId: id } }),
      prisma.customerAdminNote.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          authorAdmin: {
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
        notes: notes.map((n) => ({
          id: n.id,
          body: n.body,
          visibility: n.visibility,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
          author: n.authorAdmin,
        })),
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/customers/[id]/notes]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const adminId = gate.session.user!.id;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = customerNoteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.customerAdminNote.create({
        data: {
          userId: id,
          authorAdminId: adminId,
          body: parsed.data.body,
          visibility: parsed.data.visibility,
        },
      });
      await recordCustomerAudit(tx, {
        userId: id,
        actorAdminId: adminId,
        actionType: CUSTOMER_AUDIT_ACTIONS.NOTE_CREATE,
        reason: '',
        metadata: { noteId: created.id, visibility: created.visibility },
      });
      return created;
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: note.id,
        createdAt: note.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('[POST /api/admin/customers/[id]/notes]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
