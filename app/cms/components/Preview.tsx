'use client';
import { useCMS } from '../CMSContext';
import { renderSection } from '@/lib/sections';

function escHtml(s: string) { return s ? s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }

export function Preview() {
  const { data, previewOpen, setDevice, currentDevice } = useCMS();
  const sz = currentDevice === 'mobile' ? 375 : currentDevice === 'tablet' ? 768 : 100;

  const themeColors: Record<string, { primary: string; accent: string }> = {
    modern: { primary: '#4f46e5', accent: '#059669' }, warm: { primary: '#d97706', accent: '#b45309' },
    academic: { primary: '#1e3a8a', accent: '#1e40af' }, creative: { primary: '#db2777', accent: '#c026d3' },
    minimal: { primary: '#0f172a', accent: '#334155' }, emerald: { primary: '#047857', accent: '#059669' },
    sunset: { primary: '#ea580c', accent: '#7c3aed' }, cyber: { primary: '#0284c7', accent: '#0891b2' },
  };

  const th = data.theme || {};
  const st = data.style || {};
  const tc = themeColors[th.name || 'modern'] || themeColors.modern;
  const s = data.site || {}; const h = data.hero || {}; const a = data.about || {}; const p = data.philosophy || {}; const c = data.contact || {};

  function rgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const fontMap: Record<string, { h: string; b: string }> = {
    'modern-sans': { h: "'Plus Jakarta Sans',sans-serif", b: "'Inter',sans-serif" },
    'classic-serif': { h: "'Playfair Display',serif", b: "'Inter',serif" },
    'academic': { h: "'Merriweather',serif", b: "'Source Sans Pro',sans-serif" },
    'playful': { h: "'DM Sans',sans-serif", b: "'Nunito',sans-serif" },
    'minimalist': { h: "'Helvetica Neue',sans-serif", b: "'Helvetica Neue',sans-serif" },
    'elegant': { h: "'Cormorant Garamond',serif", b: "'Proza Libre',sans-serif" },
  };
  const fp = fontMap[st.fontPair as string] || fontMap['modern-sans'];
  const rad = ({ sharp: '4px', rounded: '12px', pill: '32px' } as any)[st.roundness || 'rounded'] || '12px';
  const sh = ({ flat: 'none', soft: '0 1px 2px rgba(0,0,0,0.05)', elevated: '0 2px 4px rgba(0,0,0,0.08)', deep: '0 3px 6px rgba(0,0,0,0.12)' } as any)[st.shadowDepth || 'soft'] || '0 1px 2px rgba(0,0,0,0.05)';
  const sp = ({ compact: '48px', normal: '96px', spacious: '140px' } as any)[st.spacing || 'normal'] || '96px';
  const btnR = ({ square: '2px', rounded: '12px', pill: '9999px' } as any)[st.buttonStyle || 'rounded'] || '12px';
  const hdrFixed = st.headerFixed !== false;

  const statsHtml = (a.stats || []).map((st: any) => `<div style="text-align:center"><strong style="font-size:1.3rem;color:${tc.primary};display:block">${escHtml(st.number)}${escHtml(st.suffix||'')}</strong><span style="font-size:.7rem;color:#94a3b8">${escHtml(st.label||'')}</span></div>`).join('');
  const coursesHtml = (data.courses || []).map((co: any) => `<div style="padding:16px;border:1px solid rgba(255,255,255,0.06);border-radius:${rad};margin-bottom:8px;background:#1a1f2e"><div style="font-size:1.1rem;margin-bottom:4px">${escHtml(co.icon||'')}</div><strong>${escHtml(co.title||'')}</strong><p style="font-size:.75rem;color:#94a3b8;margin:2px 0">${escHtml(co.description||'')}</p><span style="font-size:.65rem;background:${rgba(tc.accent,.15)};color:${tc.accent};padding:2px 8px;border-radius:999px">${escHtml(co.level||'')}</span></div>`).join('');
  const pointsHtml = (p.points || []).map((pt: any) => `<div style="background:#1a1f2e;padding:12px;border-radius:${rad};border:1px solid rgba(255,255,255,0.06)"><strong>${escHtml(pt.title||'')}</strong><p style="font-size:.75rem;color:#94a3b8;margin-top:4px">${escHtml(pt.description||'')}</p></div>`).join('');
  const achievementsHtml = (data.achievements || []).map((ach: any) => `<div style="padding:16px;border:1px solid rgba(255,255,255,0.06);border-radius:${rad};margin-bottom:8px;background:#1a1f2e"><span style="font-size:.65rem;background:${rgba(tc.primary,.15)};color:${tc.primary};padding:2px 8px;border-radius:999px;font-weight:700">${escHtml(ach.year||'')}</span><strong style="display:block;margin-top:4px">${escHtml(ach.title||'')}</strong><p style="font-size:.75rem;color:#94a3b8">${escHtml(ach.description||'')}</p></div>`).join('');
  const customHtml = (data.customSections || [])
    .filter((cs: any) => Array.isArray(cs.blocks) && cs.blocks.length > 0)
    .map((cs: any) => renderSection(cs)).join('');

  const previewDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>
    :root{--p:${tc.primary};--a:${tc.accent};--color-primary:${tc.primary};--color-accent:${tc.accent};--fh:${fp.h};--fb:${fp.b};--rd:${rad};--sh:${sh};--sp:${sp};--br:${btnR}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:var(--fb);color:#f1f5f9;line-height:1.6;background:#0b0f1a}
    .container{max-width:900px;margin:0 auto;padding:0 20px}
    .navbar{background:rgba(11,15,26,0.85);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,0.06);padding:12px 0;position:${hdrFixed?'sticky':'static'};top:0;z-index:10}
    .logo{font-weight:800;font-size:1rem;color:var(--p);text-decoration:none}
    .hero{padding:32px 0;text-align:${th.heroStyle||'centered'}}
    .hero__title{font-size:1.7rem;font-weight:800;margin-bottom:8px;font-family:var(--fh);color:#fff}
    .hl{color:var(--p)}.hero__desc{font-size:.85rem;color:#94a3b8;max-width:480px;${th.heroStyle==='centered'?'margin:0 auto':''}}
    .section{padding:var(--sp) 0}.section__title{font-size:1.15rem;font-weight:700;margin-bottom:14px;text-align:center;font-family:var(--fh)}
    .stats{display:flex;justify-content:space-around;background:#1a1f2e;padding:14px;border-radius:var(--rd);border:1px solid rgba(255,255,255,0.06);margin-top:14px}
    .phil{display:grid;grid-template-columns:1fr 1fr;gap:10px}.foot{padding:16px 0;text-align:center;font-size:.75rem;color:#64748b;border-top:1px solid rgba(255,255,255,0.06);margin-top:24px}
    @media(max-width:600px){.phil{grid-template-columns:1fr}}
    .reveal{opacity:1 !important;transform:none !important}
  </style></head><body>
  <div class="navbar"><div class="container"><span class="logo">${escHtml(s.title||'Portfolio')}</span></div></div>
  <section class="hero"><div class="container"><span style="font-size:.65rem;font-weight:700;color:var(--p);text-transform:uppercase;letter-spacing:.1em">${escHtml(h.tagline||'')}</span>
    <h1 class="hero__title">Empowering <span class="hl">${escHtml(h.highlight||'Every Learner')}</span></h1>
    <p class="hero__desc">${escHtml(h.description||'')}</p></div></section>
  <section class="section"><div class="container"><h2 class="section__title">About Me</h2><p style="font-size:.85rem;color:#94a3b8">${escHtml(a.lead||'')}</p><div class="stats">${statsHtml}</div></div></section>
  <section class="section" style="background:#111827"><div class="container"><h2 class="section__title">Courses</h2>${coursesHtml}</div></section>
  <section class="section"><div class="container"><h2 class="section__title">Philosophy</h2><div style="background:#1a1f2e;padding:14px;border-left:4px solid var(--p);border-radius:0 var(--rd) var(--rd) 0;font-style:italic;font-size:.85rem;margin-bottom:16px">"${escHtml(p.quote||'')}"</div><div class="phil">${pointsHtml}</div></div></section>
  <section class="section" style="background:#111827"><div class="container"><h2 class="section__title">Achievements</h2>${achievementsHtml}</div></section>
  ${customHtml}
  <section class="section"><div class="container"><h2 class="section__title">Get in Touch</h2><p style="font-size:.8rem;text-align:center;color:#94a3b8">${escHtml(c.email||'')} &bull; ${escHtml(c.phone||'')}</p></div></section>
  <footer class="foot"><p>&copy; ${new Date().getFullYear()} ${escHtml(s.title||'')}</p></footer>
  </body></html>`;

  return (
    <div className={'cms-preview' + (previewOpen ? ' open' : '')}>
      <div className="preview-toolbar">
        <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mr-1">Preview</span>
        {['desktop', 'tablet', 'mobile'].map(d => (
          <button key={d} className={'device-btn' + (currentDevice === d ? ' active' : '')} onClick={() => setDevice(d)}>
            {d === 'desktop' ? '🖥 Desktop' : d === 'tablet' ? '📱 Tablet' : '📱 Mobile'}
          </button>
        ))}
      </div>
      <iframe className={'preview-frame preview-' + currentDevice} srcDoc={previewDoc} title="Preview" />
    </div>
  );
}