'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import {
  renderFractal, DEFAULT_REGION, zoomRegion, maxIterForZoom,
  FRACTAL_PALETTES, FractalKind, FractalRegion, FractalPalette,
} from '@/lib/fractal';

export default function FractalPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [kind, setKind] = useState<FractalKind>('mandelbrot');
  const [palIdx, setPalIdx] = useState(0);
  const [region, setRegion] = useState<FractalRegion>(DEFAULT_REGION);
  const [juliaC, setJuliaC] = useState({ re: -0.7, im: 0.27 });
  const [rendering, setRendering] = useState(true);
  const dragRef = useRef<{ x: number; y: number; start: FractalRegion } | null>(null);

  const pal: FractalPalette = FRACTAL_PALETTES[palIdx];

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    // defer to let the spinner paint
    requestAnimationFrame(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
      const W = Math.floor(cssW * dpr), H = Math.floor(cssH * dpr);
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      const maxIter = maxIterForZoom(region);
      const img = renderFractal(W, H, kind, region, maxIter, pal, juliaC);
      ctx.putImageData(img, 0, 0);
      setRendering(false);
    });
  }, [kind, region, pal, juliaC]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const onResize = () => render();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [render]);

  const canvasToComplex = (cx: number, cy: number): [number, number] => {
    const canvas = canvasRef.current!;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const re = region.reMin + (cx / w) * (region.reMax - region.reMin);
    const im = region.imMax - (cy / h) * (region.imMax - region.imMin);
    return [re, im];
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, start: { ...region } };
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const dx = e.clientX - rect.left - dragRef.current.x;
    const dy = e.clientY - rect.top - dragRef.current.y;
    const s = dragRef.current.start;
    const w = canvasRef.current!.clientWidth, h = canvasRef.current!.clientHeight;
    const rePerPx = (s.reMax - s.reMin) / w;
    const imPerPx = (s.imMax - s.imMin) / h;
    setRegion({
      reMin: s.reMin - dx * rePerPx,
      reMax: s.reMax - dx * rePerPx,
      imMin: s.imMin + dy * imPerPx,
      imMax: s.imMax + dy * imPerPx,
    });
  };

  const onPointerUp = () => { dragRef.current = null; };

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const [re, im] = canvasToComplex(e.clientX - rect.left, e.clientY - rect.top);
    setRegion(r => zoomRegion(r, 1.6, re, im));
    if (kind === 'julia') {
      setJuliaC({ re: Math.round(re * 100) / 100, im: Math.round(im * 100) / 100 });
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const [re, im] = canvasToComplex(e.clientX - rect.left, e.clientY - rect.top);
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    setRegion(r => zoomRegion(r, factor, re, im));
  };

  const reset = () => { setRegion(DEFAULT_REGION); setKind('mandelbrot'); setJuliaC({ re: -0.7, im: 0.27 }); };

  return (
    <div className="min-h-screen bg-surface-950 text-slate-200 font-sans flex flex-col">
      <header className="glass-strong border-b border-white/[0.06] px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
        <Link href="/" className="flex items-center no-underline text-white">
          <Logo size={30} wordmark />
        </Link>
        <div className="w-4 h-4 rounded-full bg-white/10" />
        <Link href="/" className="text-xs text-slate-400 no-underline font-medium hover:text-slate-200 transition-colors">← Home</Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[0.65rem] text-slate-500 hidden sm:inline">Mandelbrot set · escape-time iteration</span>
        </div>
      </header>

      <main className="flex-1 p-5 flex flex-col gap-4 max-w-6xl w-full mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {(['mandelbrot', 'julia'] as FractalKind[]).map(k => (
              <button key={k} onClick={() => setKind(k)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${kind === k ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/25' : 'bg-surface-800 text-slate-400 border border-white/10 hover:border-white/20'}`}>
                {k}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {FRACTAL_PALETTES.map((p, i) => (
              <button key={p.name} onClick={() => setPalIdx(i)} title={p.name} className={`w-8 h-8 rounded-lg transition-all ${palIdx === i ? 'ring-2 ring-brand-400 scale-110' : 'opacity-70 hover:opacity-100'}`} style={{ background: `linear-gradient(135deg, rgb(${p.colors[0].join(',')}), rgb(${p.colors[p.colors.length - 1].join(',')}))` }} />
            ))}
          </div>
          <button onClick={reset} className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-800 text-slate-300 border border-white/10 hover:border-white/20 transition-all">↺ Reset</button>
          {rendering && (
            <span className="text-xs text-brand-300 flex items-center gap-2 ml-auto">
              <span className="w-3 h-3 rounded-full border-2 border-brand-500/30 border-t-brand-400 animate-spin" />
              rendering…
            </span>
          )}
        </div>

        <div className="relative flex-1 min-h-[480px] rounded-2xl overflow-hidden border border-white/[0.06] bg-black shadow-glow">
          <canvas
            ref={canvasRef}
            className="w-full h-full block touch-none cursor-crosshair"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
            onWheel={onWheel}
          />
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-surface-900/60 backdrop-blur-sm rounded-full text-[0.65rem] text-slate-400 border border-white/[0.06]">
            {kind === 'mandelbrot' ? 'drag = pan · double-click / wheel = zoom' : 'double-click sets Julia c · drag = pan'}
          </div>
          {kind === 'julia' && (
            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-surface-900/60 backdrop-blur-sm rounded-full text-[0.65rem] text-slate-400 border border-white/[0.06]">
              c = {juliaC.re.toFixed(2)} + {juliaC.im.toFixed(2)}i
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
