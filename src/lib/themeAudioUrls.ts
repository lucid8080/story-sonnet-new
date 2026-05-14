import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import {
  firstPublicAudioKeyByPrefixes,
  firstPrivateAudioKeyByPrefixes,
  headPrivateAudioObjectExists,
  publicUrlForObjectKey,
  presignPrivateAudioGetUrl,
} from '@/lib/s3';

const INTRO_REL = 'Intro_song/theme.mp3';
const FULL_REL = 'full_song/theme.mp3';

function uniqueSlugs(primarySlug: string, slugAliases: string[] = []): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [primarySlug, ...slugAliases]) {
    const s = raw.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** Prefer `music/` subfolder (matches common R2 layouts), then flat layout. */
function introPathCandidates(slug: string): string[] {
  return [
    `/audio/${slug}/music/${INTRO_REL}`,
    `/audio/${slug}/${INTRO_REL}`,
  ];
}

function fullPathCandidates(slug: string): string[] {
  return [
    `/audio/${slug}/music/${FULL_REL}`,
    `/audio/${slug}/${FULL_REL}`,
  ];
}

/** Object keys for private bucket (no leading slash). */
export function themeAudioKeyCandidates(
  slug: string,
  kind: 'intro' | 'full',
  slugAliases: string[] = []
): string[] {
  const slugs = uniqueSlugs(slug, slugAliases);
  const paths = slugs.flatMap((s) =>
    kind === 'intro' ? introPathCandidates(s) : fullPathCandidates(s)
  );
  return Array.from(new Set(paths.map((p) => p.replace(/^\/+/, ''))));
}

function resolveClientPath(webPath: string): string {
  return resolvePublicAssetUrl(webPath) ?? webPath;
}

/** True when this URL path is backed by a file in /public (SSR Node only). */
function localPublicThemeFileExists(webPath: string): boolean {
  try {
    const rel = webPath.replace(/^\/+/, '');
    const full = path.join(process.cwd(), 'public', rel);
    return existsSync(full);
  } catch {
    return false;
  }
}

/**
 * If the theme file exists under `public/`, dev often needs same-origin `/audio/...`
 * so the browser hits Next static files even when `NEXT_PUBLIC_ASSETS_BASE_URL` points at R2.
 */
function clientSrcWhenFileOnDisk(webPath: string): string {
  const resolved = resolveClientPath(webPath);
  const remote = Boolean(process.env.NEXT_PUBLIC_ASSETS_BASE_URL?.trim());
  if (remote && process.env.NODE_ENV === 'development') {
    return webPath;
  }
  return resolved;
}

export function themeIntroPathForSlug(slug: string): string {
  return introPathCandidates(slug)[0];
}

export function themeFullPathForSlug(slug: string): string {
  return fullPathCandidates(slug)[0];
}

/** Default public paths (music-first); use probe result for playback when possible. */
export function themeAudioClientSrcs(slug: string): {
  introSrc: string;
  fullSrc: string;
} {
  return {
    introSrc: resolveClientPath(introPathCandidates(slug)[0]),
    fullSrc: resolveClientPath(fullPathCandidates(slug)[0]),
  };
}

function absoluteUrlForServerProbe(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://127.0.0.1:3000';
  return new URL(href.startsWith('/') ? href : `/${href}`, base).toString();
}

async function probeAudioExists(absoluteUrl: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    let res = await fetch(absoluteUrl, {
      method: 'HEAD',
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 501) {
      res = await fetch(absoluteUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        cache: 'no-store',
        signal: ctrl.signal,
      });
      return res.ok || res.status === 206;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

type ThemeResolve = { mode: 'public'; clientSrc: string } | { mode: 'private' };

function folderPrefixesFromPathCandidates(pathCandidates: string[]): string[] {
  const seen = new Set<string>();
  for (const p of pathCandidates) {
    const normalized = p.replace(/^\/+/, '');
    const slash = normalized.lastIndexOf('/');
    if (slash <= 0) continue;
    seen.add(`${normalized.slice(0, slash + 1)}`);
  }
  return Array.from(seen);
}

async function firstReachableThemeUrl(
  pathCandidates: string[]
): Promise<ThemeResolve | null> {
  for (const webPath of pathCandidates) {
    if (localPublicThemeFileExists(webPath)) {
      return { mode: 'public', clientSrc: clientSrcWhenFileOnDisk(webPath) };
    }
    const clientSrc = resolveClientPath(webPath);
    const abs = absoluteUrlForServerProbe(clientSrc);
    const publicProbeOk = await probeAudioExists(abs);
    if (publicProbeOk) {
      return { mode: 'public', clientSrc };
    }
    const key = webPath.replace(/^\/+/, '');
    const privateHeadOk = await headPrivateAudioObjectExists(key);
    if (privateHeadOk) {
      return { mode: 'private' };
    }
  }
  const privateFolderPrefixes = folderPrefixesFromPathCandidates(pathCandidates);
  const discoveredPrivateKey =
    await firstPrivateAudioKeyByPrefixes(privateFolderPrefixes);
  if (discoveredPrivateKey) {
    return { mode: 'private' };
  }
  const discoveredPublicKey =
    await firstPublicAudioKeyByPrefixes(privateFolderPrefixes);
  if (discoveredPublicKey) {
    const webPath = `/${discoveredPublicKey.replace(/^\/+/, '')}`;
    const clientSrc =
      resolvePublicAssetUrl(publicUrlForObjectKey(discoveredPublicKey)) ??
      resolveClientPath(webPath);
    return { mode: 'public', clientSrc };
  }
  return null;
}

export type ThemeAudioProbeResult = {
  hasIntroTheme: boolean;
  hasFullTheme: boolean;
  themeIntroSrc: string | null;
  themeFullSrc: string | null;
  themeIntroUseSignedPlayback: boolean;
  themeFullUseSignedPlayback: boolean;
};

/** First private-bucket key that exists, or null (checks run in parallel). */
export async function firstExistingPrivateThemeKey(
  slug: string,
  kind: 'intro' | 'full',
  slugAliases: string[] = []
): Promise<string | null> {
  const slugs = uniqueSlugs(slug, slugAliases);
  const keys = themeAudioKeyCandidates(slug, kind, slugAliases);
  const exists = await Promise.all(
    keys.map((k) => headPrivateAudioObjectExists(k))
  );
  const i = exists.findIndex(Boolean);
  if (i !== -1) return keys[i]!;

  const pathCandidates = slugs.flatMap((s) =>
    kind === 'intro' ? introPathCandidates(s) : fullPathCandidates(s)
  );
  const prefixes = folderPrefixesFromPathCandidates(pathCandidates);
  return firstPrivateAudioKeyByPrefixes(prefixes);
}

/**
 * For viewers who may play theme audio, presign private theme objects once on the story page
 * so the client avoids an extra `/api/theme-audio/play` round trip after hydration.
 */
export async function resolvePrivateThemeUrlsForViewer(
  slug: string,
  probe: ThemeAudioProbeResult,
  canPlayTheme: boolean,
  slugAliases: string[] = []
): Promise<ThemeAudioProbeResult> {
  if (!canPlayTheme) return probe;

  let themeIntroSrc = probe.themeIntroSrc;
  let themeFullSrc = probe.themeFullSrc;
  let themeIntroUseSignedPlayback = probe.themeIntroUseSignedPlayback;
  let themeFullUseSignedPlayback = probe.themeFullUseSignedPlayback;

  if (probe.themeIntroUseSignedPlayback && probe.hasIntroTheme) {
    try {
      const key = await firstExistingPrivateThemeKey(slug, 'intro', slugAliases);
      if (key) {
        themeIntroSrc = await presignPrivateAudioGetUrl({ key });
        themeIntroUseSignedPlayback = false;
      }
    } catch {
      /* client can fall back to /api/theme-audio/play */
    }
  }

  if (probe.themeFullUseSignedPlayback && probe.hasFullTheme) {
    try {
      const key = await firstExistingPrivateThemeKey(slug, 'full', slugAliases);
      if (key) {
        themeFullSrc = await presignPrivateAudioGetUrl({ key });
        themeFullUseSignedPlayback = false;
      }
    } catch {
      /* client can fall back to /api/theme-audio/play */
    }
  }

  return {
    ...probe,
    themeIntroSrc,
    themeFullSrc,
    themeIntroUseSignedPlayback,
    themeFullUseSignedPlayback,
  };
}

export async function probeThemeAudioAvailability(
  slug: string,
  slugAliases: string[] = []
): Promise<ThemeAudioProbeResult> {
  const slugs = uniqueSlugs(slug, slugAliases);
  const introPaths = slugs.flatMap((s) => introPathCandidates(s));
  const fullPaths = slugs.flatMap((s) => fullPathCandidates(s));

  const [introRes, fullRes] = await Promise.all([
    firstReachableThemeUrl(introPaths),
    firstReachableThemeUrl(fullPaths),
  ]);

  const hasIntroTheme = introRes != null;
  const hasFullTheme = fullRes != null;
  const themeIntroSrc = introRes?.mode === 'public' ? introRes.clientSrc : null;
  const themeFullSrc = fullRes?.mode === 'public' ? fullRes.clientSrc : null;
  const themeIntroUseSignedPlayback = introRes?.mode === 'private';
  const themeFullUseSignedPlayback = fullRes?.mode === 'private';

  return {
    hasIntroTheme,
    hasFullTheme,
    themeIntroSrc,
    themeFullSrc,
    themeIntroUseSignedPlayback,
    themeFullUseSignedPlayback,
  };
}
