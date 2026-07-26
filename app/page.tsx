'use client';

import { useState } from 'react';

const themes = [
  { id: 'modern', label: 'Modern', primary: '#4f46e5', accent: '#059669' },
  { id: 'warm', label: 'Warm', primary: '#d97706', accent: '#b45309' },
  { id: 'academic', label: 'Academic', primary: '#1e3a8a', accent: '#1e40af' },
  { id: 'creative', label: 'Creative', primary: '#db2777', accent: '#c026d3' },
  { id: 'minimal', label: 'Minimal', primary: '#0f172a', accent: '#334155' },
  { id: 'emerald', label: 'Emerald', primary: '#047857', accent: '#059669' },
  { id: 'sunset', label: 'Sunset', primary: '#ea580c', accent: '#7c3aed' },
  { id: 'cyber', label: 'Cyber STEM', primary: '#0284c7', accent: '#0891b2' },
];

const examples = [
  { name: 'Ms. Sarah Johnson', subject: 'Mathematics & Science', years: '8' },
  { name: 'Mr. David Chen', subject: 'English Literature', years: '12' },
  { name: 'Mrs. Emily Rodriguez', subject: 'History & Social Studies', years: '15' },
];

export default function Home() {
  const [step, setStep] = useState<'welcome' | 'setup' | 'done'>('welcome');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [years, setYears] = useState('');
  const [tagline, setTagline] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const useExample = (ex: typeof examples[0]) => {
    setName(ex.name);
    setSubject(ex.subject);
    setYears(ex.years);
    setTagline(`Passionate ${ex.subject.toLowerCase()} educator with ${ex.years}+ years of experience`);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!subject.trim()) { setError('Please enter what you teach'); return; }
    setError('');
    setSaving(true);
    try {
      const data = {
        theme: { name: selectedTheme, layout: 'wide', heroStyle: 'centered' },
        style: { fontPair: 'modern-sans', roundness: 'rounded', shadowDepth: 'soft', spacing: 'normal', headerFixed: true, buttonStyle: 'rounded', sectionStyle: 'bordered' },
        site: { title: name + (subject ? ` — ${subject} Teacher` : '') },
        seo: { metaTitle: `${name} — Teacher Portfolio`, metaDesc: tagline || `Passionate educator with ${years || 'many'} years of experience.`, ogImage: '', googleAnalytics: '' },
        hero: { tagline: tagline || `Welcome to My Teaching Portfolio`, title: 'Empowering Every Learner', highlight: 'Every Learner', description: `Dedicated to creating engaging, inclusive learning experiences for ${subject ? subject.toLowerCase() : 'all'} students.`, initials: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(), heroImage: '' },
        about: { lead: `Hello! I'm ${name}, a dedicated ${subject ? subject.toLowerCase() : ''} educator with ${years || 'many'} years of experience.`, paragraphs: ['My teaching journey has taken me through multiple subjects and grade levels.', 'I believe every student has unique potential and deserves a supportive learning environment.'], stats: [{ number: years || '10', suffix: '+', label: 'Years Experience' }, { number: '500', suffix: '+', label: 'Students Mentored' }, { number: '3', suffix: '', label: 'Subject Specializations' }] },
        courses: [{ icon: '📖', title: subject || 'My Subject', description: `Engaging ${subject ? subject.toLowerCase() : ''} lessons tailored to every learner.`, level: 'All Grades' }],
        philosophy: { quote: 'Education is not the filling of a pail, but the lighting of a fire.', attribution: '— William Butler Yeats', points: [{ title: 'Student-Centered', description: 'Focusing on individual needs while fostering independence.' }, { title: 'Inclusive Classroom', description: 'Creating a safe environment where all students feel valued.' }, { title: 'Real-World Connections', description: 'Linking curriculum to real-life applications.' }, { title: 'Continuous Growth', description: 'Embracing lifelong learning and adapting teaching methods.' }] },
        achievements: [{ year: new Date().getFullYear().toString(), title: 'Teaching Excellence', description: 'Committed to providing quality education.' }],
        contact: { email: '', phone: '', location: '' },
      };
      const res = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Save failed');
      await fetch('/api/build', { method: 'POST' });
      setStep('done');
    } catch (e: any) {
      setError('Something went wrong: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px' }}>Your Portfolio is Ready!</h1>
          <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: '.95rem' }}>{name}&apos;s teacher portfolio has been created with the {themes.find(t => t.id === selectedTheme)?.label} theme.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/cms" style={{ padding: '12px 28px', background: '#6366f1', color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>Edit in CMS →</a>
            <a href="/_site" style={{ padding: '12px 28px', background: 'rgba(255,255,255,.1)', color: '#e2e8f0', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}>View Portfolio</a>
            <button onClick={() => setStep('welcome')} style={{ padding: '12px 28px', background: 'transparent', color: '#94a3b8', borderRadius: 10, fontWeight: 600, border: '1px solid #334155', cursor: 'pointer' }}>Start Over</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <button onClick={() => setStep('welcome')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '.82rem', marginBottom: 20, padding: 0 }}>← Back</button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px' }}>Create Your Portfolio</h1>
          <p style={{ color: '#94a3b8', fontSize: '.85rem', marginBottom: 24 }}>Fill in the basics — we&apos;ll handle the rest.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {examples.map((ex, i) => (
              <button key={i} onClick={() => useExample(ex)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,.06)', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: '.72rem', flex: 1 }}>{ex.name.split(' ').pop()} Sample</button>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4, color: '#cbd5e1' }}>Your Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ms. Sarah Johnson" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: '.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4, color: '#cbd5e1' }}>What do you teach? *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics, Science, English..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: '.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4, color: '#cbd5e1' }}>Years of Experience</label>
            <input value={years} onChange={e => setYears(e.target.value)} placeholder="e.g. 10" type="number" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: '.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4, color: '#cbd5e1' }}>Tagline (optional)</label>
            <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Passionate educator with..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: '.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 10, color: '#cbd5e1' }}>Choose a Theme</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {themes.map(t => (
                <div key={t.id} onClick={() => setSelectedTheme(t.id)} style={{ padding: 10, border: `2px solid ${selectedTheme === t.id ? '#6366f1' : '#334155'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: selectedTheme === t.id ? 'rgba(99,102,241,.1)' : 'transparent', transition: 'all .15s' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: t.primary }} />
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: t.accent }} />
                  </div>
                  <div style={{ fontSize: '.7rem', color: '#94a3b8' }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ color: '#f87171', fontSize: '.82rem', marginBottom: 12 }}>{error}</div>}

          <button onClick={handleCreate} disabled={saving} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: saving ? '#475569' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: '.95rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating...' : '✨ Create My Portfolio'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🍎</div>
      <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px' }}>Teacher Portfolio</h1>
      <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: 32, maxWidth: 420 }}>
        Create a beautiful portfolio website in under a minute. Just fill in your name, subject, and pick a theme.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => setStep('setup')} style={{ padding: '14px 32px', background: '#6366f1', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer' }}>
          🚀 Create Your Portfolio
        </button>
        <a href="/cms" style={{ padding: '14px 32px', background: 'rgba(255,255,255,.08)', color: '#e2e8f0', borderRadius: 12, fontWeight: 600, fontSize: '1rem', textDecoration: 'none' }}>
          Open CMS
        </a>
      </div>
      <div style={{ marginTop: 48, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { icon: '✏️', title: '1. Enter your details', desc: 'Name, subject, experience' },
          { icon: '🎨', title: '2. Pick a theme', desc: 'Choose from 8 designs' },
          { icon: '🌐', title: '3. Get your site', desc: 'Portfolio ready instantly' },
        ].map((f, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '18px 20px', width: 170, textAlign: 'left' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{f.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '.82rem', marginBottom: 2 }}>{f.title}</div>
            <div style={{ fontSize: '.72rem', color: '#94a3b8' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
