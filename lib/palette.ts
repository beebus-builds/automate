// ──────────────────────────────────────────────
//  Color Harmony Generator
//  Pure HSL color-wheel math: complementary,
//  analogous, triadic, split-complementary,
//  and mono palettes from a single seed color.
// ──────────────────────────────────────────────

export type HarmonyScheme = 'complementary' | 'analogous' | 'triadic' | 'split' | 'mono';

interface HSL { h: number; s: number; l: number; }

/** Normalize hex → RGB */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** RGB → HSL */
function rgbToHsl([r, g, b]: [number, number, number]): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** HSL → hex */
function hslToHex({ h, s, l }: HSL): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s));
  l = Math.min(100, Math.max(0, l));
  const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l / 100 - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function wrap(h: number): number { return ((h % 360) + 360) % 360; }

/**
 * Generate a 5-color harmony palette from a seed hex.
 * Returns an object keyed by theme slot:
 * primary, accent, background, surface, text-ish.
 */
export function generateHarmonyPalette(seed: string, scheme: HarmonyScheme = 'complementary'): {
  primary: string; accent: string; background: string; surface: string; highlight: string;
} {
  const base = rgbToHsl(hexToRgb(seed));

  // Anchor hue points per scheme
  let primaryH: number, accentH: number, bgH: number, surfaceH: number, hlH: number;
  switch (scheme) {
    case 'complementary':
      primaryH = base.h;
      accentH = wrap(base.h + 180);
      bgH = wrap(base.h - 15);
      surfaceH = wrap(base.h + 10);
      hlH = accentH;
      break;
    case 'analogous':
      primaryH = base.h;
      accentH = wrap(base.h + 30);
      bgH = wrap(base.h - 25);
      surfaceH = wrap(base.h + 10);
      hlH = wrap(base.h + 30);
      break;
    case 'triadic':
      primaryH = base.h;
      accentH = wrap(base.h + 120);
      bgH = wrap(base.h - 30);
      surfaceH = wrap(base.h + 60);
      hlH = wrap(base.h + 120);
      break;
    case 'split':
      primaryH = base.h;
      accentH = wrap(base.h + 150);
      bgH = wrap(base.h - 25);
      surfaceH = wrap(base.h + 12);
      hlH = wrap(base.h - 150);
      break;
    case 'mono':
    default:
      primaryH = base.h;
      accentH = wrap(base.h + 5);
      bgH = base.h;
      surfaceH = base.h;
      hlH = base.h;
      break;
  }

  // Is the seed light or dark? decide bg/surface luminosity
  const light = base.l > 55;
  const bgL = light ? 88 : 8;
  const surfaceL = light ? 78 : 14;
  const primaryL = light ? 42 : 60;
  const accentL = light ? 38 : 66;

  return {
    primary: hslToHex({ h: primaryH, s: Math.max(45, Math.min(80, base.s)), l: primaryL }),
    accent: hslToHex({ h: accentH, s: Math.max(55, Math.min(85, base.s + 5)), l: accentL }),
    background: hslToHex({ h: bgH, s: light ? 25 : 40, l: bgL }),
    surface: hslToHex({ h: surfaceH, s: light ? 20 : 30, l: surfaceL }),
    highlight: hslToHex({ h: hlH, s: 70, l: light ? 32 : 72 }),
  };
}

/** Describe a scheme in words (for the UI tooltip) */
export const SCHEME_INFO: Record<HarmonyScheme, string> = {
  complementary: 'Seed + direct opposite (180°)',
  analogous: 'Seed + neighbors (30° apart)',
  triadic: 'Three hues evenly spaced (120°)',
  split: 'Seed + two beside its opposite',
  mono: 'Single hue at varying lightness',
};

/** Contrast-safe text color for a given bg hex */
export function readableText(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 128 ? '#0f172a' : '#f1f5f9';
}
