'use client';
import { useCMS } from '../CMSContext';

export function ThemeTab() {
  const { data, update } = useCMS();
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

  const radioStyle = { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '.85rem' as const };

  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>Themes &amp; Style</h2><p>Customize the look and feel.</p></div>
      <div className="cms-section"><div className="cms-section__title">Theme Color Presets</div>
        <p style={{ fontSize: '.82rem', color: '#64748b', marginBottom: 14 }}>Click to apply instantly.</p>
        <div className="theme-selector">
          {themes.map(t => (
            <div key={t.id} className={'theme-card' + (th.name === t.id ? ' active' : '')} onClick={() => update('theme.name', t.id)}>
              <div className="theme-card__swatch">
                <div style={{ background: t.primary, width: 22, height: 22, borderRadius: '50%', display: 'inline-block' }} />
                <div style={{ background: t.accent, width: 22, height: 22, borderRadius: '50%', display: 'inline-block' }} />
              </div>
              <div className="theme-card__info"><strong>{t.label}</strong><span>{t.desc}</span></div>
            </div>
          ))}
        </div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Layout Width</div>
        <div style={{ display: 'flex', gap: 24 }}>{['wide', 'boxed', 'full'].map(l => (
          <label key={l} style={radioStyle}><input type="radio" name="layout" checked={th.layout === l} onChange={() => update('theme.layout', l)} />{l.charAt(0).toUpperCase() + l.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Hero Alignment</div>
        <div style={{ display: 'flex', gap: 24 }}>{['centered', 'split', 'left'].map(s => (
          <label key={s} style={radioStyle}><input type="radio" name="heroStyle" checked={th.heroStyle === s} onChange={() => update('theme.heroStyle', s)} />{s.charAt(0).toUpperCase() + s.slice(1)}</label>
        ))}</div>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />
      <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: 16 }}>Advanced Style Customization</h3>

      <div className="cms-section"><div className="cms-section__title">Font Pair</div>
        <select className="cms-input" style={{ maxWidth: 320 }} value={sty.fontPair || 'modern-sans'} onChange={e => update('style.fontPair', e.target.value)}>
          {fontOpts.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      <div className="cms-section"><div className="cms-section__title">Corner Roundness</div>
        <div style={{ display: 'flex', gap: 24 }}>{['sharp', 'rounded', 'pill'].map(r => (
          <label key={r} style={radioStyle}><input type="radio" name="roundness" checked={sty.roundness === r} onChange={() => update('style.roundness', r)} />{r.charAt(0).toUpperCase() + r.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Shadow Depth</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>{['flat', 'soft', 'elevated', 'deep'].map(s => (
          <label key={s} style={radioStyle}><input type="radio" name="shadowDepth" checked={sty.shadowDepth === s} onChange={() => update('style.shadowDepth', s)} />{s.charAt(0).toUpperCase() + s.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Section Spacing</div>
        <div style={{ display: 'flex', gap: 24 }}>{['compact', 'normal', 'spacious'].map(s => (
          <label key={s} style={radioStyle}><input type="radio" name="spacing" checked={sty.spacing === s} onChange={() => update('style.spacing', s)} />{s.charAt(0).toUpperCase() + s.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Button Shape</div>
        <div style={{ display: 'flex', gap: 24 }}>{['square', 'rounded', 'pill'].map(b => (
          <label key={b} style={radioStyle}><input type="radio" name="buttonStyle" checked={sty.buttonStyle === b} onChange={() => update('style.buttonStyle', b)} />{b.charAt(0).toUpperCase() + b.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Section Style</div>
        <div style={{ display: 'flex', gap: 24 }}>{['bordered', 'elevated', 'minimal'].map(s => (
          <label key={s} style={radioStyle}><input type="radio" name="sectionStyle" checked={sty.sectionStyle === s} onChange={() => update('style.sectionStyle', s)} />{s.charAt(0).toUpperCase() + s.slice(1)}</label>
        ))}</div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Header Behavior</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem' }}>
          <input type="checkbox" checked={sty.headerFixed !== false} onChange={e => update('style.headerFixed', e.target.checked)} />Fixed header (stays at top)
        </label>
      </div>
    </div>
  );
}
