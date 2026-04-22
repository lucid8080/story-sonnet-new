import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { generationOptionUpdateSchema } from '@/lib/generation/schemas';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = generationOptionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const generationOption = (prisma as typeof prisma & {
    generationOption?: { update: (args: unknown) => Promise<unknown> };
  }).generationOption;
  if (!generationOption) {
    return NextResponse.json(
      { ok: false, error: 'Generation options are unavailable until Prisma client is regenerated.' },
      { status: 503 }
    );
  }

  try {
    const updated = await generationOption.update({
      where: { id },
      data: {
        ...(parsed.data.vendorLabel !== undefined
          ? { vendorLabel: parsed.data.vendorLabel ?? null }
          : {}),
        ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
        ...(parsed.data.value !== undefined ? { value: parsed.data.value } : {}),
        ...(parsed.data.envKeyRequired !== undefined
          ? { envKeyRequired: parsed.data.envKeyRequired ?? null }
          : {}),
        ...(parsed.data.isEnabled !== undefined
          ? { isEnabled: parsed.data.isEnabled }
          : {}),
        ...(parsed.data.sortOrder !== undefined
          ? { sortOrder: parsed.data.sortOrder }
          : {}),
      },
    });
    return NextResponse.json({ ok: true, option: updated });
  } catch (error) {
    console.error('[admin/generation/options/:id PATCH]', error);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 409 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  const generationOption = (prisma as typeof prisma & {
    generationOption?: { delete: (args: unknown) => Promise<unknown> };
  }).generationOption;
  if (!generationOption) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Generation options are unavailable until Prisma client is regenerated.',
      },
      { status: 503 }
    );
  }

  try {
    await generationOption.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/generation/options/:id DELETE]', error);
    return NextResponse.json({ ok: false, error: 'Delete failed' }, { status: 409 });
  }
}
