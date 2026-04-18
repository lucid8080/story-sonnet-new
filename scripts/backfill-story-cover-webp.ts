/**
 * Audit public raster images for stories (`cover_url`) and blog posts (`featured_image_url`):
 * re-encode to WebP ≤50KB, upload to R2 (`*_display.webp` sidecar or overwrite `_display.webp`),
 * update DB when URL / storage key should change.
 *
 * Usage (repo root):
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/backfill-story-cover-webp.ts [--dry-run] [--limit N] [--scope stories|blog|all]
 */
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { resolvePublicAssetUrl } from '../src/lib/resolvePublicAssetUrl';
import {
  getDefaultStorageBucket,
  getPublicObjectBuffer,
  objectKeyFromPublicAssetUrl,
  publicUrlForObjectKey,
  uploadPublicObject,
} from '../src/lib/s3';
import { displayKeyFromOriginalKey } from '../src/lib/images/displayKey';
import {
  encodeCoverWebpMaxBytes,
  isDecodableRasterImage,
  type EncodeDisplayWebpResult,
} from '../src/lib/images/encodeDisplayWebp';

const prisma = new PrismaClient();

const MAX_BYTES = 50_000;
const BLOG_MAX_WIDTH = 1200;

type Scope = 'stories' | 'blog' | 'all';

function parseArgs(): {
  dryRun: boolean;
  limit: number | undefined;
  scope: Scope;
} {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const limitIdx = argv.indexOf('--limit');
  let limit: number | undefined;
  if (limitIdx >= 0 && argv[limitIdx + 1]) {
    const n = parseInt(argv[limitIdx + 1], 10);
    if (Number.isFinite(n) && n > 0) limit = n;
  }
  const scopeIdx = argv.indexOf('--scope');
  let scope: Scope = 'all';
  if (scopeIdx >= 0 && argv[scopeIdx + 1]) {
    const s = argv[scopeIdx + 1].toLowerCase();
    if (s === 'stories' || s === 'blog' || s === 'all') scope = s;
  }
  return { dryRun, limit, scope };
}

async function fetchAssetBuffer(
  resolvedUrl: string,
  objectKey: string
): Promise<Buffer | null> {
  try {
    const r = await fetch(resolvedUrl, { redirect: 'follow' });
    if (r.ok) {
      return Buffer.from(await r.arrayBuffer());
    }
  } catch {
    /* try S3 */
  }
  return getPublicObjectBuffer(objectKey);
}

type PipelineReady = {
  status: 'ready';
  inputBytes: number;
  uploadKey: string;
  newPublicUrl: string;
  encoded: EncodeDisplayWebpResult;
};

type PipelineSkip = { status: 'skip'; message: string };
type PipelineErr = { status: 'error'; message: string };

async function runDisplayWebpPipeline(
  label: string,
  rawUrl: string,
  maxWidth: number | undefined
): Promise<PipelineReady | PipelineSkip | PipelineErr> {
  const raw = rawUrl.trim();
  const resolved = resolvePublicAssetUrl(raw) ?? raw;
  const objectKey = objectKeyFromPublicAssetUrl(resolved);
  if (!objectKey) {
    return {
      status: 'skip',
      message: `[skip] ${label}: could not map URL to object key (${resolved})`,
    };
  }

  const buf = await fetchAssetBuffer(resolved, objectKey);
  if (!buf?.length) {
    return {
      status: 'skip',
      message: `[skip] ${label}: empty or failed fetch (${resolved})`,
    };
  }

  const meta = await sharp(buf).metadata().catch(() => null);
  if (meta?.format === 'gif') {
    return { status: 'skip', message: `[skip] ${label}: GIF not converted` };
  }

  if (!(await isDecodableRasterImage(buf))) {
    return {
      status: 'skip',
      message: `[skip] ${label}: not a raster image (SVG or unsupported)`,
    };
  }

  if (meta?.format === 'webp' && buf.length <= MAX_BYTES) {
    return {
      status: 'skip',
      message: `[ok] ${label}: webp already ≤${MAX_BYTES}b (${buf.length}b)`,
    };
  }

  let encoded: EncodeDisplayWebpResult;
  try {
    encoded = await encodeCoverWebpMaxBytes(buf, {
      maxBytes: MAX_BYTES,
      ...(maxWidth != null ? { maxWidth } : {}),
    });
  } catch (e) {
    return {
      status: 'error',
      message: `[error] ${label}: encode failed ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const lowerKey = objectKey.toLowerCase();
  const uploadKey = lowerKey.endsWith('_display.webp')
    ? objectKey
    : displayKeyFromOriginalKey(objectKey);

  let newPublicUrl: string;
  try {
    newPublicUrl = publicUrlForObjectKey(uploadKey);
  } catch (e) {
    return {
      status: 'error',
      message: `[error] ${label}: publicUrlForObjectKey ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return {
    status: 'ready',
    inputBytes: buf.length,
    uploadKey,
    newPublicUrl,
    encoded,
  };
}

async function main() {
  const { dryRun, limit, scope } = parseArgs();
  const bucket = getDefaultStorageBucket();
  if (!bucket && !dryRun) {
    console.error('Set R2_BUCKET or S3_BUCKET for uploads.');
    process.exit(1);
  }

  let processed = 0;
  let skipped = 0;
  let updated = 0;
  let errors = 0;

  const runStories = scope === 'stories' || scope === 'all';
  const runBlog = scope === 'blog' || scope === 'all';

  if (runStories) {
    const rows = await prisma.story.findMany({
      where: { coverUrl: { not: null } },
      select: { id: true, slug: true, coverUrl: true },
      orderBy: { slug: 'asc' },
      ...(limit != null ? { take: limit } : {}),
    });

    for (const row of rows) {
      const raw = row.coverUrl!.trim();
      const out = await runDisplayWebpPipeline(`story:${row.slug}`, raw, undefined);

      if (out.status === 'skip') {
        console.log(out.message);
        skipped++;
        continue;
      }
      if (out.status === 'error') {
        console.error(out.message);
        errors++;
        continue;
      }

      const { inputBytes, uploadKey, newPublicUrl, encoded } = out;
      const needsDbUpdate = newPublicUrl.trim() !== raw.trim();

      console.log(
        `[${dryRun ? 'dry-run' : 'run'}] story:${row.slug}: ${inputBytes}b → ${encoded.byteLength}b q=${encoded.qualityUsed} key=${uploadKey}${needsDbUpdate ? ' (DB URL update)' : ' (in-place or same URL)'}`
      );

      if (dryRun) {
        processed++;
        continue;
      }

      await uploadPublicObject({
        bucket: bucket!,
        key: uploadKey,
        body: encoded.webpBuffer,
        contentType: 'image/webp',
      });

      if (needsDbUpdate) {
        await prisma.story.update({
          where: { id: row.id },
          data: { coverUrl: newPublicUrl },
        });
        updated++;
      }

      processed++;
    }
  }

  if (runBlog) {
    const posts = await prisma.blogPost.findMany({
      where: { featuredImageUrl: { not: null } },
      select: {
        id: true,
        slug: true,
        featuredImageUrl: true,
        featuredImageStorageKey: true,
      },
      orderBy: { slug: 'asc' },
      ...(limit != null ? { take: limit } : {}),
    });

    for (const row of posts) {
      const raw = row.featuredImageUrl!.trim();
      const out = await runDisplayWebpPipeline(
        `blog:${row.slug}`,
        raw,
        BLOG_MAX_WIDTH
      );

      if (out.status === 'skip') {
        console.log(out.message);
        skipped++;
        continue;
      }
      if (out.status === 'error') {
        console.error(out.message);
        errors++;
        continue;
      }

      const { inputBytes, uploadKey, newPublicUrl, encoded } = out;
      const storageTrim = row.featuredImageStorageKey?.trim() ?? '';
      const needsDbUpdate =
        newPublicUrl.trim() !== raw.trim() || uploadKey !== storageTrim;

      console.log(
        `[${dryRun ? 'dry-run' : 'run'}] blog:${row.slug}: ${inputBytes}b → ${encoded.byteLength}b q=${encoded.qualityUsed} key=${uploadKey}${needsDbUpdate ? ' (DB update)' : ' (in-place or same)'}`
      );

      if (dryRun) {
        processed++;
        continue;
      }

      await uploadPublicObject({
        bucket: bucket!,
        key: uploadKey,
        body: encoded.webpBuffer,
        contentType: 'image/webp',
      });

      if (needsDbUpdate) {
        await prisma.blogPost.update({
          where: { id: row.id },
          data: {
            featuredImageUrl: newPublicUrl,
            featuredImageStorageKey: uploadKey,
          },
        });
        updated++;
      }

      processed++;
    }
  }

  console.log(
    JSON.stringify(
      {
        processed,
        skipped,
        updated,
        errors,
        dryRun,
        limit: limit ?? null,
        scope,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
