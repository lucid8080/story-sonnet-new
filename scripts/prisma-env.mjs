/**
 * Loads `.env` (minimal KEY=VALUE lines), then ensures DIRECT_DATABASE_URL exists
 * so Prisma schema `directUrl` is satisfied. If unset, copies DATABASE_URL (fine for
 * local Postgres; Neon production should set a real direct / non-pooler URL).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

function loadDotEnvFile() {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnvFile();

if (!process.env.DIRECT_DATABASE_URL?.trim() && process.env.DATABASE_URL) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error('Usage: node scripts/prisma-env.mjs <prisma subcommand> [...args]');
  process.exit(1);
}

/**
 * On Windows, `prisma generate` renames a temp file onto `query_engine-*.dll.node`.
 * If another Node process (e.g. `next dev`) has loaded that DLL, rename fails with EPERM.
 * Removing the existing engine first avoids the conflict when the file is not locked.
 */
function prepareWindowsPrismaGenerate(projectRoot) {
  if (process.platform !== 'win32' || prismaArgs[0] !== 'generate') return;

  const clientDir = path.join(projectRoot, 'node_modules', '.prisma', 'client');
  if (!fs.existsSync(clientDir)) return;

  let entries;
  try {
    entries = fs.readdirSync(clientDir);
  } catch {
    return;
  }

  const toRemove = entries.filter(
    (name) =>
      (name.startsWith('query_engine-') && name.endsWith('.dll.node')) ||
      (name.includes('query_engine') && name.includes('.tmp'))
  );

  for (const name of toRemove) {
    const full = path.join(clientDir, name);
    try {
      fs.unlinkSync(full);
    } catch (e) {
      const code = /** @type {{ code?: string }} */ (e)?.code;
      if (code === 'EPERM' || code === 'EBUSY' || code === 'ENOENT') {
        if (code === 'ENOENT') continue;
        console.error(
          '[prisma-env] Cannot update Prisma query engine (file is in use). Stop `npm run dev` and any other Node processes using this project, then run the command again.'
        );
        process.exit(1);
      }
      throw e;
    }
  }
}

prepareWindowsPrismaGenerate(root);

const result = spawnSync('npx', ['prisma', ...prismaArgs], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
