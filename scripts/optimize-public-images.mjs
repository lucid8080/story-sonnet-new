/**
 * One-time / occasional: walk `public/` for .png/.jpg/.jpeg and write `{base}_display.webp`
 * beside each source (originals unchanged). Matches R2 sidecar naming in `displayKeyFromOriginalKey`.
 *
 * Usage: node scripts/optimize-public-images.mjs [--force]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

const EXT_RE = /\.(png|jpe?g)$/i;
const FORCE = process.argv.includes('--force');

const QUALITY_LADDER = [92, 88, 84, 78, 72, 66, 60, 54, 48, 42, 38];
const TARGET_MAX = 70_000;
const MAX_W_START = 1400;
const SHRINK_ROUNDS = 4;

async function main() {
  const sharp = (await import('sharp')).default;
  const files = await collectRasterFiles(PUBLIC);
  let written = 0;
  let skipped = 0;

  for (const abs of files) {
    const rel = path.relative(PUBLIC, abs);
    const dir = path.dirname(abs);
    const base = path.basename(abs).replace(EXT_RE, '');
    const outAbs = path.join(dir, `${base}_display.webp`);

    if (!FORCE) {
      try {
        await fs.access(outAbs);
        skipped++;
        continue;
      } catch {
        /* missing */
      }
    }

    const input = await fs.readFile(abs);
    const meta0 = await sharp(input).metadata();
    if (!meta0.width || !meta0.height) {
      console.warn(`[skip] ${rel}: unreadable`);
      continue;
    }
    if (meta0.format === 'svg') continue;

    let chosen = null;
    let maxW =
      meta0.width > MAX_W_START ? MAX_W_START : meta0.width;

    for (let round = 0; round < SHRINK_ROUNDS; round++) {
      const basePipe = sharp(input).rotate();
      const meta = await basePipe.metadata();
      const pipeline =
        meta.width && meta.width > maxW
          ? basePipe.resize(maxW, null, {
              withoutEnlargement: true,
              fit: 'inside',
            })
          : basePipe;

      let roundBuf = null;
      for (const q of QUALITY_LADDER) {
        const { data } = await pipeline
          .clone()
          .webp({ quality: q, effort: 5 })
          .toBuffer({ resolveWithObject: true });
        if (data.length <= TARGET_MAX) {
          roundBuf = data;
          break;
        }
      }
      if (!roundBuf) {
        const { data } = await pipeline
          .clone()
          .webp({ quality: 38, effort: 6 })
          .toBuffer({ resolveWithObject: true });
        roundBuf = data;
      }
      chosen = roundBuf;
      if (chosen.length <= TARGET_MAX || round === SHRINK_ROUNDS - 1) {
        if (chosen.length > TARGET_MAX) {
          console.warn(
            `[warn] ${rel}: ${chosen.length}b still > ${TARGET_MAX} (maxW=${maxW})`
          );
        }
        break;
      }
      maxW = Math.max(280, Math.floor(maxW * 0.82));
    }

    if (!chosen) continue;

    await fs.writeFile(outAbs, chosen);
    console.log(`[write] ${path.relative(ROOT, outAbs)} (${chosen.length}b)`);
    written++;
  }

  console.log(
    JSON.stringify({ written, skipped, scanned: files.length }, null, 0)
  );
}

async function collectRasterFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectRasterFiles(p)));
    } else if (EXT_RE.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
