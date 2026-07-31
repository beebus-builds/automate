'use client';
import { useCMS } from '../CMSContext';
import { Inp, TA } from './Dashboard';

export function General() {
  const { data } = useCMS();
  const s = data.site || {};
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>General</h2><p>Basic site information.</p></div>
      <div className="cms-section"><div className="cms-section__title">Site Settings</div>
        <div className="form-group"><label>Site Title</label><Inp path="site.title" val={s.title || ''} ph="My Teacher Portfolio" /></div>
      </div>
    </div>
  );
}

export function Hero() {
  const { data } = useCMS();
  const h = data.hero || {};
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>Hero Section</h2><p>Main banner of your portfolio.</p></div>
      <div className="cms-section"><div className="cms-section__title">Hero Content</div>
        <div className="form-group"><label>Tagline</label><Inp path="hero.tagline" val={h.tagline || ''} ph="Welcome to My Teaching Portfolio" /></div>
        <div className="form-group"><label>Title</label><Inp path="hero.title" val={h.title || ''} ph="Empowering Every Learner" /></div>
        <div className="form-group"><label>Highlight Word</label><Inp path="hero.highlight" val={h.highlight || ''} ph="Every Learner" /></div>
        <div className="form-group"><label>Description</label><TA path="hero.description" val={h.description || ''} ph="Dedicated to creating engaging learning experiences." /></div>
        <div className="form-group"><label>Avatar Initials</label><Inp path="hero.initials" val={h.initials || ''} ph="TP" /></div>
        <div className="form-group"><label>Hero Image URL (optional)</label><Inp path="hero.heroImage" val={h.heroImage || ''} ph="https://example.com/photo.jpg" /></div>
      </div>
    </div>
  );
}

export function About() {
  const { data, update } = useCMS();
  const a = data.about || {};
  const handleStatChange = (i: number, field: string, val: string) => {
    const stats = [...(a.stats || [])];
    if (!stats[i]) stats[i] = { number: '', suffix: '', label: '' };
    stats[i] = { ...stats[i], [field]: val };
    update('about.stats', stats);
  };
  const addStat = () => update('about.stats', [...(a.stats || []), { number: '', suffix: '', label: '' }]);
  const removeStat = (i: number) => update('about.stats', (a.stats || []).filter((_: any, idx: number) => idx !== i));
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>About Me</h2><p>Your professional bio.</p></div>
      <div className="cms-section"><div className="cms-section__title">Biography</div>
        <div className="form-group"><label>Lead Sentence</label><TA path="about.lead" val={a.lead || ''} ph="Hello! I am a dedicated educator..." /></div>
        <div className="form-group"><label>Paragraph 1</label><TA path="about.paragraphs[0]" val={(a.paragraphs||[''])[0] || ''} ph="My teaching journey..." /></div>
        <div className="form-group"><label>Paragraph 2</label><TA path="about.paragraphs[1]" val={(a.paragraphs||['',''])[1] || ''} ph="I believe every student..." /></div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Statistics</div>
        {(a.stats || []).map((st: any, i: number) => (
          <div key={i} className="flex gap-2 items-center mb-2">
            <input className="cms-input max-w-[80px]" value={st.number} onChange={e => handleStatChange(i, 'number', e.target.value)} placeholder="10" />
            <input className="cms-input max-w-[60px]" value={st.suffix} onChange={e => handleStatChange(i, 'suffix', e.target.value)} placeholder="+" />
            <input className="cms-input flex-1" value={st.label} onChange={e => handleStatChange(i, 'label', e.target.value)} placeholder="Years Experience" />
            <button className="cms-btn cms-btn--danger cms-btn--small" onClick={() => removeStat(i)}>✕</button>
          </div>
        ))}
        <button className="cms-btn cms-btn--secondary cms-btn--small" onClick={addStat}>+ Add Stat</button>
      </div>
    </div>
  );
}

export function Contact() {
  const { data } = useCMS();
  const c = data.contact || {};
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>Contact</h2><p>How visitors can reach you.</p></div>
      <div className="form-group"><label>Email</label><Inp path="contact.email" val={c.email || ''} ph="teacher@example.com" /></div>
      <div className="form-group"><label>Phone</label><Inp path="contact.phone" val={c.phone || ''} ph="+1 (555) 123-4567" /></div>
      <div className="form-group"><label>Location</label><Inp path="contact.location" val={c.location || ''} ph="City, State" /></div>
    </div>
  );
}
