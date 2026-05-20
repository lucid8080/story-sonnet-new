import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  parseExternalKeywordLinkRules,
  parseFeatureImageCustomPresets,
} from '@/lib/blog/blog-admin-settings';
import { blogAdminSettingsPatchSchema } from '@/lib/validation/blogSchemas';

export const runtime = 'nodejs';

async function getOrCreateBlogAdminSettings() {
  let row = await prisma.blogAdminSettings.findUnique({
    where: { id: 'global' },
  });
  if (!row) {
    row = await prisma.blogAdminSettings.create({
      data: {
        id: 'global',
        featureImageStyleCustomPresetsJson: [],
        autoKeywordLinkRulesJson: [],
      },
    });
  }
  return row;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const row = await getOrCreateBlogAdminSettings();
    const featureImageStyleCustomPresets = parseFeatureImageCustomPresets(
      row.featureImageStyleCustomPresetsJson
    );
    const autoKeywordLinkRules = parseExternalKeywordLinkRules(
      row.autoKeywordLinkRulesJson
    );
    return NextResponse.json({
      ok: true,
      featureImageStyleCustomPresets,
      autoKeywordLinkRules,
    });
  } catch (e) {
    console.error('[admin/blog/admin-settings GET]', e);
    return NextResponse.json(
      { ok: false, error: 'Load failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = blogAdminSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  const existing = await getOrCreateBlogAdminSettings();
  const featurePresets =
    parsed.data.featureImageStyleCustomPresets !== undefined
      ? parsed.data.featureImageStyleCustomPresets
      : parseFeatureImageCustomPresets(
          existing.featureImageStyleCustomPresetsJson
        );
  const linkRules =
    parsed.data.autoKeywordLinkRules !== undefined
      ? parsed.data.autoKeywordLinkRules
      : parseExternalKeywordLinkRules(existing.autoKeywordLinkRulesJson);

  try {
    const row = await prisma.blogAdminSettings.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        featureImageStyleCustomPresetsJson: featurePresets,
        autoKeywordLinkRulesJson: linkRules,
      },
      update: {
        featureImageStyleCustomPresetsJson: featurePresets,
        autoKeywordLinkRulesJson: linkRules,
      },
    });
    const featureImageStyleCustomPresets = parseFeatureImageCustomPresets(
      row.featureImageStyleCustomPresetsJson
    );
    const autoKeywordLinkRules = parseExternalKeywordLinkRules(
      row.autoKeywordLinkRulesJson
    );
    return NextResponse.json({
      ok: true,
      featureImageStyleCustomPresets,
      autoKeywordLinkRules,
    });
  } catch (e) {
    console.error('[admin/blog/admin-settings PATCH]', e);
    return NextResponse.json(
      { ok: false, error: 'Save failed' },
      { status: 500 }
    );
  }
}
