'use client';
import { useMemo, useState } from 'react';
import { useCMS } from '../CMSContext';
import { generateHarmonyPalette, readableText, HarmonyScheme, SCHEME_INFO } from '@/lib/palette';

export function ThemeTab() {
  const { data, update, showToast } = useCMS();
  const [seed, setSeed] = useState('#6366f1');
  const [scheme, setScheme] = useState<HarmonyScheme>('complementary');
  const themes = [
    { id: 'modern', label: 'Modern', primary: '#4f46e5', accent: '#059669', desc: 'Indigo & Emerald' },
    { id: 'warm', label: 'Warm', primary: '#d97706', accent: '#b45309', desc: 'Amber & Gold' },
    { id: 'academic', label: 'Academic', primary: '#1e3a8a', accent: '#1e40af', desc: 'Classic Navy' },
    { id: 'creative', label: 'Creative', primary: '#db2777', accent: '#c026d3', desc: 'Bold Pink & Magenta' },
    { id: 'minimal', label: 'Minimal', primary: '#0f172a', accent: '#334155', desc: 'Sleek Charcoal' },
    { id: 'emerald', label: 'Emerald', primary: '#047857', accent: '#059669', desc: 'Forest Green' },
    { id: 'sunset', label: 'Sunset', primary: '#ea580c', accent: '#7c3aed', desc: 'Coral & Violet' },
    { id: 'cyber', label: 'Cyber STEM', primary: '#0284c7', accent: '#0891b2', desc: 'Cyan & Tech Slate' },
  ];
  const th = data.theme || { name: 'modern', layout: 'wide', heroStyle: 'centered' };
  const sty = data.style || { fontPair: 'modern-sans', roundness: 'rounded', shadowDepth: 'soft', spacing: 'normal', headerFixed: true, buttonStyle: 'rounded', sectionStyle: 'bordered' };

  const fontOpts = [
    { id: 'modern-sans', label: 'Modern Sans' }, { id: 'classic-serif', label: 'Classic Serif' },
    { id: 'academic', label: 'Academic' }, { id: 'playful', label: 'Playful' },
    { id: 'minimalist', label: 'Minimalist' }, { id: 'elegant', label: 'Elegant' },
  ];

  const labelCls = 'flex items-center gap-2 cursor-pointer text-sm';

  const harmony = useMemo(() => generateHarmonyPalette(seed, scheme), [seed, scheme]);

  const applyCustomTheme = () => {
    update('theme.name', 'custom');
    update('theme.customColors', harmony);
    showToast('Custom palette applied!');
  };

  return (
    <div className="cms-panel">
      <div className="cms-panel__header"><h2>Themes &amp; Style</h2><p>Customize the look and feel.</p></div>
      <div className="cms-section">
        <div className="cms-section__title">Theme Color Presets</div>
        <p className="text-sm text-slate-400 mb-3">Click to apply instantly.</p>
        <div className="theme-selector">
          {themes.map(t => (
            <div key={t.id} className={'theme-card' + (th.name === t.id ? ' active' : '')} onClick={() => update('theme.name', t.id)}>
              <div className="theme-card__swatch">
                <div className="w-[22px] h-[22px] rounded-full inline-block" style={{ background: t.primary }} />
                <div className="w-[22px] h-[22px] rounded-full inline-block" style={{ background: t.accent }} />
              </div>
              <div className="theme-card__info"><strong>{t.label}</strong><span>{t.desc}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="cms-section">
        <div className="cms-section__title">Palette Studio <span className="normal-case font-normal text-slate-500">(color-harmony generator)</span></div>
        <div className="bg-surface-50 border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex gap-3 items-center mb-3 flex-wrap">
            <label className="text-xs font-semibold text-slate-400">Seed color</label>
            <input type="color" value={seed} onChange={e => setSeed(e.target.value)} className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            <input type="text" value={seed} onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{6}$/.test(v)) setSeed(v); }} className="cms-input max-w-[110px]" />
            <span className="text-xs text-slate-500">HSL color-wheel math →</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {(Object.keys(SCHEME_INFO) as HarmonyScheme[]).map(s => (
              <button key={s} onClick={() => setScheme(s)} title={SCHEME_INFO[s]} className={`px-3 py-1 rounded-full text-[0.65rem] font-semibold transition-colors ${scheme === s ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-transparent text-slate-400 border border-white/10 hover:border-white/20'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 mb-4">
            {Object.entries(harmony).map(([k, hex]) => (
              <div key={k} className="flex-1">
                <div className="h-10 rounded-lg border border-white/10" style={{ background: hex }} title={`${k}: ${hex}`} />
                <div className="text-[0.6rem] text-slate-500 mt-1 truncate text-center">{k}</div>
              </div>
            ))}
          </div>
          <button onClick={applyCustomTheme} className="cms-btn cms-btn--primary">🎨 Apply Custom Theme</button>
          {th.name === 'custom' && th.customColors && (
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Custom palette active
            </div>
          )}
        </div>
      </div>

      <div className="cms-section">
        <div className="cms-section__title">Layout Width</div>
        <div className="flex gap-6">{['wide', 'boxed', 'full'].map(l => (
          <label key={l} className={labelCls}><input type="radio" name="layout" checked={th.layout === l} onChange={() => update('theme.layout', l)} />{l.charAt(0).toUpperCase() + l.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section">
        <div className="cms-section__title">Hero Alignment</div>
        <div className="flex gap-6">{['centered', 'split', 'left'].map(s => (
          <label key={s} className={labelCls}><input type="radio" name="heroStyle" checked={th.heroStyle === s} onChange={() => update('theme.heroStyle', s)} />{s.charAt(0).toUpperCase() + s.slice(1)}</label>
        ))}</div>
      </div>

      <hr className="border-0 border-t border-slate-700 my-6" />
      <h3 className="text-[0.9rem] font-bold mb-4">Advanced Style Customization</h3>

      <div className="cms-section"><div className="cms-section__title">Font Pair</div>
        <select className="cms-input max-w-[320px]" value={sty.fontPair || 'modern-sans'} onChange={e => update('style.fontPair', e.target.value)}>
          {fontOpts.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      <div className="cms-section"><div className="cms-section__title">Corner Roundness</div>
        <div className="flex gap-6 flex-wrap">{['sharp', 'rounded', 'pill'].map(r => (
          <label key={r} className={labelCls}><input type="radio" name="roundness" checked={sty.roundness === r} onChange={() => update('style.roundness', r)} />{r.charAt(0).toUpperCase() + r.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Shadow Depth</div>
        <div className="flex gap-6 flex-wrap">{['flat', 'soft', 'elevated', 'deep'].map(s => (
          <label key={s} className={labelCls}><input type="radio" name="shadowDepth" checked={sty.shadowDepth === s} onChange={() => update('style.shadowDepth', s)} />{s.charAt(0).toUpperCase() + s.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Section Spacing</div>
        <div className="flex gap-6">{['compact', 'normal', 'spacious'].map(s => (
          <label key={s} className={labelCls}><input type="radio" name="spacing" checked={sty.spacing === s} onChange={() => update('style.spacing', s)} />{s.charAt(0).toUpperCase() + s.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Button Shape</div>
        <div className="flex gap-6">{['square', 'rounded', 'pill'].map(b => (
          <label key={b} className={labelCls}><input type="radio" name="buttonStyle" checked={sty.buttonStyle === b} onChange={() => update('style.buttonStyle', b)} />{b.charAt(0).toUpperCase() + b.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Section Style</div>
        <div className="flex gap-6">{['bordered', 'elevated', 'minimal'].map(s => (
          <label key={s} className={labelCls}><input type="radio" name="sectionStyle" checked={sty.sectionStyle === s} onChange={() => update('style.sectionStyle', s)} />{s.charAt(0).toUpperCase() + s.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Header Behavior</div>
        <label className="flex items-center gap-2 cursor-pointer text-[0.85rem]">
          <input type="checkbox" checked={sty.headerFixed !== false} onChange={e => update('style.headerFixed', e.target.checked)} />Fixed header (stays at top)
        </label>
      </div>
    </div>
  );
}
