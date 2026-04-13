/** Parse #RRGGBB (6 hex digits). */
export function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const t = hex.trim();
  const m = /^#([0-9a-f]{6})$/i.exec(t);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function normalizeHex6(hex: string): string | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toUpperCase();
}

function linearize(channel: number): number {
  const x = channel / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance in [0, 1]. */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const R = linearize(rgb.r);
  const G = linearize(rgb.g);
  const B = linearize(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * light_bg = use dark text (pastel / light backgrounds).
 * dark_bg = use light text (saturated / dark backgrounds).
 */
export function barForegroundMode(hex: string): 'light_bg' | 'dark_bg' {
  const L = relativeLuminance(hex);
  if (L == null) return 'dark_bg';
  return L > 0.55 ? 'light_bg' : 'dark_bg';
}

export type BarTextClasses = {
  primary: string;
  secondary: string;
  cta: string;
  badge: string;
  dismiss: string;
};

export function barTextClassNames(mode: 'light_bg' | 'dark_bg'): BarTextClasses {
  if (mode === 'light_bg') {
    return {
      primary: 'text-slate-900',
      secondary: 'text-slate-700',
      cta: 'text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-700',
      badge: 'bg-slate-900/10 text-slate-800',
      dismiss: 'bg-slate-900/10 text-slate-800 hover:bg-slate-900/15',
    };
  }
  return {
    primary: 'text-white',
    secondary: 'text-white/90',
    cta: 'text-white underline decoration-white/50 underline-offset-2 hover:decoration-white',
    badge: 'bg-white/15 text-white',
    dismiss: 'bg-white/15 text-white hover:bg-white/25',
  };
}
