import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import { headPrivateAudioObjectExists } from '@/lib/s3';

const INTRO_REL = 'Intro_song/theme.mp3';
const FULL_REL = 'full_song/theme.mp3';

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
  kind: 'intro' | 'full'
): string[] {
  const paths =
    kind === 'intro' ? introPathCandidates(slug) : fullPathCandidates(slug);
  return paths.map((p) => p.replace(/^\/+/, ''));
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

async function firstReachableThemeUrl(
  pathCandidates: string[]
): Promise<ThemeResolve | null> {
  for (const webPath of pathCandidates) {
    if (localPublicThemeFileExists(webPath)) {
      return { mode: 'public', clientSrc: clientSrcWhenFileOnDisk(webPath) };
    }
    const clientSrc = resolveClientPath(webPath);
    const abs = absoluteUrlForServerProbe(clientSrc);
    if (await probeAudioExists(abs)) {
      return { mode: 'public', clientSrc };
    }
    const key = webPath.replace(/^\/+/, '');
    if (await headPrivateAudioObjectExists(key)) {
      return { mode: 'private' };
    }
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

export async function probeThemeAudioAvailability(
  slug: string
): Promise<ThemeAudioProbeResult> {
  const introPaths = introPathCandidates(slug);
  const fullPaths = fullPathCandidates(slug);

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
