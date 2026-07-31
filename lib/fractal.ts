// ──────────────────────────────────────────────
//  Fractal renderer — Mandelbrot & Julia sets
//  Pixel-per-pixel escape-time iteration with
//  smooth (continuous) coloring via log2.
// ──────────────────────────────────────────────

export type FractalKind = 'mandelbrot' | 'julia';

export interface FractalPalette {
  name: string;
  colors: [number, number, number][];
}

export const FRACTAL_PALETTES: FractalPalette[] = [
  { name: 'Inferno', colors: [[0, 0, 4], [76, 6, 44], [182, 30, 53], [252, 112, 30], [252, 225, 60]] },
  { name: 'Ocean', colors: [[1, 4, 28], [7, 42, 96], [28, 110, 164], [90, 170, 200], [170, 230, 230]] },
  { name: 'Aurora', colors: [[5, 20, 40], [20, 90, 90], [40, 180, 120], [120, 240, 120], [220, 255, 170]] },
  { name: 'Neon', colors: [[10, 0, 30], [60, 0, 120], [140, 0, 220], [0, 200, 255], [255, 255, 255]] },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function paletteFromHexes(hexes: string[]): FractalPalette {
  return { name: 'Custom', colors: hexes.map(hexToRgb) };
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

/** Sample the palette at normalized position t ∈ [0,1] */
function samplePalette(pal: FractalPalette, t: number): [number, number, number] {
  t = Math.min(1, Math.max(0, t));
  const n = pal.colors.length - 1;
  const pos = t * n;
  const i = Math.min(Math.floor(pos), n - 1);
  const frac = pos - i;
  const c1 = pal.colors[i], c2 = pal.colors[i + 1];
  return [
    Math.round(lerp(c1[0], c2[0], frac)),
    Math.round(lerp(c1[1], c2[1], frac)),
    Math.round(lerp(c1[2], c2[2], frac)),
  ];
}

export interface FractalRegion {
  reMin: number; reMax: number; imMin: number; imMax: number;
}

export const DEFAULT_REGION: FractalRegion = { reMin: -2.5, reMax: 1.2, imMin: -1.35, imMax: 1.35 };

/** Escape-time fractal render into an ImageData buffer */
export function renderFractal(
  width: number,
  height: number,
  kind: FractalKind,
  region: FractalRegion,
  maxIter: number,
  pal: FractalPalette,
  juliaC = { re: -0.7, im: 0.27 },
): ImageData {
  const img = new ImageData(width, height);
  const data = img.data;

  for (let py = 0; py < height; py++) {
    const cIm = region.imMax - (py / (height - 1)) * (region.imMax - region.imMin);
    for (let px = 0; px < width; px++) {
      const cRe = region.reMin + (px / (width - 1)) * (region.reMax - region.reMin);

      let zRe: number, zIm: number, cReConst: number, cImConst: number;
      if (kind === 'mandelbrot') {
        zRe = 0; zIm = 0; cReConst = cRe; cImConst = cIm;
      } else {
        zRe = cRe; zIm = cIm; cReConst = juliaC.re; cImConst = juliaC.im;
      }

      let iter = 0;
      let zr2 = 0, zi2 = 0;
      while (iter < maxIter && zr2 + zi2 <= 4) {
        const zReNew = zr2 - zi2 + cReConst;
        zIm = 2 * zRe * zIm + cImConst;
        zRe = zReNew;
        zr2 = zRe * zRe;
        zi2 = zIm * zIm;
        iter++;
      }

      const idx = (py * width + px) * 4;
      if (iter >= maxIter) {
        data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
        continue;
      }

      // Smooth coloring: add fractional escape for banding-free gradients
      const logZ = Math.log(zr2 + zi2) / 2;
      const nu = logZ > 0 ? Math.log(logZ / Math.LN2) / Math.LN2 : 0;
      const smooth = iter + 1 - nu;
      const t = smooth / maxIter;
      const [r, g, b] = samplePalette(pal, t);
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  return img;
}

/** Find the center of a region as [re, im] */
export function regionCenter(region: FractalRegion): [number, number] {
  return [(region.reMin + region.reMax) / 2, (region.imMin + region.imMax) / 2];
}

/** Zoom a region toward a point by a factor (factor > 1 = zoom in) */
export function zoomRegion(region: FractalRegion, factor: number, cx?: number, cy?: number): FractalRegion {
  const [ccx, ccy] = (cx !== undefined && cy !== undefined) ? [cx, cy] : regionCenter(region);
  const reSpan = (region.reMax - region.reMin) / factor;
  const imSpan = (region.imMax - region.imMin) / factor;
  return {
    reMin: ccx - reSpan / 2,
    reMax: ccx + reSpan / 2,
    imMin: ccy - imSpan / 2,
    imMax: ccy + imSpan / 2,
  };
}

/** Estimate an iteration count from zoom depth */
export function maxIterForZoom(region: FractalRegion): number {
  const span = region.reMax - region.reMin;
  const depth = -Math.log10(Math.max(span, 1e-9));
  return Math.max(60, Math.min(2000, Math.round(60 + depth * 120)));
}
