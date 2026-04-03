#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_COVERS_ROOT = path.join(__dirname, '..', 'public', 'covers');
const ROOT = process.env.STORY_COVERS_ROOT
  ? path.resolve(process.env.STORY_COVERS_ROOT)
  : DEFAULT_COVERS_ROOT;
const VALID_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const IGNORE_NAMES = new Set(['cover.webp', '.DS_Store']);

function log(...args) {
  console.log(new Date().toISOString(), '-', ...args);
}

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function convertToWebp(inputPath, outputPath) {
  execFileSync('ffmpeg', ['-y', '-i', inputPath, '-qscale', '80', outputPath], { stdio: 'ignore' });
}

function processIncomingFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  const stem = path.basename(filePath, ext).toLowerCase();
  if (!VALID_EXTS.has(ext)) return;
  if (IGNORE_NAMES.has(base)) return;
  if (stem !== 'cover') return;
  if (!fileExists(filePath)) return;

  const dir = path.dirname(filePath);
  const output = path.join(dir, 'cover.webp');

  try {
    log('processing', filePath);
    convertToWebp(filePath, output);
    log('updated', output);
  } catch (err) {
    log('failed to convert', filePath, err.message);
  }
}

function scanExisting() {
  const storyDirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(ROOT, d.name));

  for (const dir of storyDirs) {
    const files = fs.readdirSync(dir)
      .map((name) => path.join(dir, name))
      .filter((p) => fs.statSync(p).isFile());
    for (const file of files) {
      processIncomingFile(file);
    }
  }
}

function watchDir(dir) {
  fs.watch(dir, (eventType, filename) => {
    if (!filename) return;
    const full = path.join(dir, filename);
    setTimeout(() => processIncomingFile(full), 500);
  });
  log('watching', dir);
}

function main() {
  log('covers root:', ROOT, process.env.STORY_COVERS_ROOT ? '(STORY_COVERS_ROOT)' : '(default: repo public/covers)');
  if (!fileExists(ROOT)) {
    console.error('covers root not found:', ROOT);
    process.exit(1);
  }

  scanExisting();

  const storyDirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(ROOT, d.name));

  for (const dir of storyDirs) {
    watchDir(dir);
  }

  fs.watch(ROOT, (eventType, filename) => {
    if (!filename) return;
    const full = path.join(ROOT, filename);
    setTimeout(() => {
      try {
        if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
          watchDir(full);
          const files = fs.readdirSync(full)
            .map((name) => path.join(full, name))
            .filter((p) => fs.statSync(p).isFile());
          for (const file of files) processIncomingFile(file);
        }
      } catch {}
    }, 500);
  });

  log('cover watcher ready');
}

main();
