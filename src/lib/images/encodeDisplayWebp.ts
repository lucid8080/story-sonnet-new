import sharp from 'sharp';

export type DisplayWebpPreset = 'cover' | 'blog' | 'avatar' | 'spotlight_badge';

const PRESET: Record<
  DisplayWebpPreset,
  { maxWidth: number; targetMinBytes: number; targetMaxBytes: number }
> = {
  cover: {
    maxWidth: 1400,
    targetMinBytes: 25_000,
    targetMaxBytes: 70_000,
  },
  blog: {
    maxWidth: 1200,
    targetMinBytes: 25_000,
    targetMaxBytes: 70_000,
  },
  avatar: {
    maxWidth: 400,
    targetMinBytes: 8_000,
    targetMaxBytes: 70_000,
  },
  spotlight_badge: {
    maxWidth: 512,
    targetMinBytes: 2_000,
    targetMaxBytes: 70_000,
  },
};

export type EncodeDisplayWebpResult = {
  webpBuffer: Buffer;
  width: number;
  height: number;
  qualityUsed: number;
  byteLength: number;
  /** Size within [targetMin, targetMax], or acceptable small file under max */
  targetBandHit: boolean;
};

const MIN_Q = 38;
const QUALITY_LADDER = [92, 88, 84, 78, 72, 66, 60, 54, 48, 42, MIN_Q] as const;
const MAX_SHRINK_ROUNDS = 4;

export async function encodeDisplayWebp(
  input: Buffer,
  preset: DisplayWebpPreset
): Promise<EncodeDisplayWebpResult> {
  const { targetMinBytes, targetMaxBytes } = PRESET[preset];
  let maxW = PRESET[preset].maxWidth;

  for (let round = 0; round < MAX_SHRINK_ROUNDS; round++) {
    const base = sharp(input).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height) {
      throw new Error('Could not read image dimensions');
    }

    const pipeline =
      meta.width > maxW
        ? base.resize(maxW, null, {
            withoutEnlargement: true,
            fit: 'inside',
          })
        : base;

    let chosen: {
      buf: Buffer;
      q: number;
      w: number;
      h: number;
    } | null = null;

    for (const q of QUALITY_LADDER) {
      const { data, info } = await pipeline
        .clone()
        .webp({ quality: q, effort: 5 })
        .toBuffer({ resolveWithObject: true });
      const n = data.length;
      if (n <= targetMaxBytes) {
        chosen = {
          buf: data,
          q,
          w: info.width ?? 0,
          h: info.height ?? 0,
        };
        break;
      }
    }

    if (!chosen) {
      const { data, info } = await pipeline
        .clone()
        .webp({ quality: MIN_Q, effort: 6 })
        .toBuffer({ resolveWithObject: true });
      chosen = {
        buf: data,
        q: MIN_Q,
        w: info.width ?? 0,
        h: info.height ?? 0,
      };
    }

    const byteLength = chosen.buf.length;
    const inBand =
      byteLength >= targetMinBytes && byteLength <= targetMaxBytes;

    if (byteLength <= targetMaxBytes || round === MAX_SHRINK_ROUNDS - 1) {
      if (byteLength > targetMaxBytes) {
        console.warn(
          `[encodeDisplayWebp] preset=${preset} output ${byteLength}b exceeds max ${targetMaxBytes}b (quality=${chosen.q}, maxW=${maxW})`
        );
      }
      return {
        webpBuffer: chosen.buf,
        width: chosen.w,
        height: chosen.h,
        qualityUsed: chosen.q,
        byteLength,
        targetBandHit: inBand || byteLength < targetMinBytes,
      };
    }

    maxW = Math.max(280, Math.floor(maxW * 0.82));
  }

  throw new Error('encodeDisplayWebp: could not produce output');
}

export function getDisplayWebpPreset(
  preset: DisplayWebpPreset
): (typeof PRESET)[DisplayWebpPreset] {
  return PRESET[preset];
}

/** True if Sharp can decode this buffer as a raster image (not SVG). */
export async function isDecodableRasterImage(input: Buffer): Promise<boolean> {
  try {
    const m = await sharp(input).metadata();
    return (
      m.format !== undefined &&
      m.format !== 'svg' &&
      m.width !== undefined &&
      m.height !== undefined
    );
  } catch {
    return false;
  }
}

/**
 * If buffer is already WebP under max bytes and fits within preset width, reuse without re-encoding.
 */
export async function tryReuseWebpAsDisplay(
  input: Buffer,
  preset: DisplayWebpPreset
): Promise<Buffer | null> {
  const { maxWidth, targetMaxBytes } = PRESET[preset];
  try {
    const m = await sharp(input).metadata();
    if (m.format !== 'webp' || !m.width || !m.height) return null;
    if (m.width > maxWidth || input.length > targetMaxBytes) return null;
    return input;
  } catch {
    return null;
  }
}
