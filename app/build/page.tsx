'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';
import { BuildSuccess } from '@/components/chat/BuildSuccess';
import { CallPanel } from '@/components/chat/CallPanel';
import { parseMessage, generateResponse, getSummary, emptyData, TeacherData } from '@/lib/conversation';
import { getAllThemes, getCategories, categoryColors, searchThemes, mapThemeToBuildData } from '@/lib/themes';

const allThemes = getAllThemes();
const categories = getCategories();

interface Msg {
  role: 'bot' | 'user';
  text: string;
}

function isComplete(d: TeacherData): boolean {
  return !!(d.name && d.bio && (d.subject || d.courses.length) && d.years && d.quote);
}

export default function BuildPage() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: "Hi there! I'll help you build a beautiful teacher portfolio website.\n\nTo start — **what's your full name?**" },
  ]);
  const [data, setData] = useState<TeacherData>(emptyData);
  const [dataCollected, setDataCollected] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [deployUrl, setDeployUrl] = useState('');
  const [deployStatus, setDeployStatus] = useState('');
  const [themeSearch, setThemeSearch] = useState('');
  const [themeCategory, setThemeCategory] = useState<string | null>(null);
  const [showAllThemes, setShowAllThemes] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredThemes = useMemo(() => searchThemes(themeSearch, themeCategory || undefined), [themeSearch, themeCategory]);
  const displayedThemes = useMemo(() => showAllThemes ? filteredThemes : filteredThemes.slice(0, 30), [filteredThemes, showAllThemes]);

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(async (d) => {
        setAuthChecked(true);
        if (d.user) {
          setUser(d.user);
          const sr = await fetch('/api/chat');
          const sd = await sr.json();
          if (sd.state && sd.state.messages?.length > 0) {
            setMsgs(sd.state.messages);
            if (sd.state.data) {
              const loaded = { ...emptyData, ...sd.state.data };
              setData(loaded);
              setDataCollected(isComplete(loaded));
            }
          }
        }
      })
      .catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (user && msgs.length > 1) {
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, step: dataCollected ? 'done' : 'chatting', data }),
      }).catch(() => {});
    }
  }, [msgs, data, dataCollected]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { if (user) inputRef.current?.focus(); }, [user, dataCollected]);

  const addBot = (text: string) => setMsgs(p => [...p, { role: 'bot', text }]);
  const addUser = (text: string) => setMsgs(p => [...p, { role: 'user', text }]);

  const handleSend = () => {
    const val = inputVal.trim();
    if (!val) return;
    addUser(val);
    setInputVal('');
    const { extracted } = parseMessage(val, data);
    const updated = { ...data, ...extracted };
    if (extracted.courses) updated.courses = [...new Set([...data.courses, ...extracted.courses])];
    setData(updated);
    if (isComplete(updated)) {
      setDataCollected(true);
      setTimeout(() => addBot('Great — I have everything I need! Browse **1000+ themes** below and pick the one you like:'), 300);
    } else {
      setTimeout(() => addBot(generateResponse(updated, extracted)), 250);
    }
  };

  const selectTheme = (id: string) => {
    const theme = allThemes.find(t => t.id === id);
    if (!theme) return;
    addUser(`Selected: ${theme.name}`);
    setData(p => ({ ...p, theme: id }));
    setTimeout(() => addBot(`**${theme.name}** — great choice! Hit the button below to generate your site.`), 400);
  };

  const handleGenerate = async () => {
    setBuilding(true);
    const theme = allThemes.find(t => t.id === data.theme);
    const initials = data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'TP';
    const courseList = data.courses.length > 0
      ? data.courses.map(c => ({ icon: '📘', title: c, description: `Engaging ${c.toLowerCase()} instruction tailored for student growth.`, level: 'All Levels' }))
      : [{ icon: '📘', title: data.subject || 'General Education', description: `Comprehensive ${data.subject || 'academic'} instruction.`, level: 'All Levels' }];

    const payload = {
      theme: theme ? mapThemeToBuildData(theme) : { name: 'theme-theme-1' },
      style: { fontPair: theme?.fonts?.heading || 'Inter', roundness: theme?.layout?.roundness || 'rounded', shadowDepth: theme?.layout?.shadowDepth || 'soft', spacing: theme?.layout?.spacing || 'normal', headerFixed: true, buttonStyle: theme?.layout?.buttonStyle || 'rounded', sectionStyle: theme?.layout?.cardStyle === 'glass' ? 'glass' : 'bordered' },
      site: { title: `${data.name} — Teacher Portfolio` },
      seo: { metaTitle: `${data.name} — Educator Portfolio`, metaDesc: (data.bio || '').slice(0, 160) || `Professional portfolio of ${data.name}, ${data.subject} educator.`, ogImage: '', googleAnalytics: '' },
      hero: { tagline: `${data.subject || 'Educator'} Portfolio`, title: `Welcome to ${data.name}'s Classroom`, highlight: data.name, description: data.bio || 'Dedicated to inspiring students and fostering academic excellence.', initials, heroImage: '' },
      about: { lead: data.bio, paragraphs: ['I believe every student possesses unique talents waiting to be unlocked.', 'My instructional approach centers on curiosity, critical thinking, and mutual respect.'], stats: [{ number: data.years || '5', suffix: '+', label: 'Years Teaching' }, { number: '300', suffix: '+', label: 'Students Mentored' }, { number: data.courses.length.toString() || '3', suffix: '', label: 'Subjects Taught' }] },
      courses: courseList,
      philosophy: { quote: data.quote || 'Education is not the filling of a pail, but the lighting of a fire.', attribution: data.quote ? `— ${data.name}` : '— William Butler Yeats', points: [{ title: 'Student-Centered', description: 'Tailoring lessons to accommodate diverse learning styles.' }, { title: 'Active Engagement', description: 'Encouraging hands-on problem solving and discussion.' }, { title: 'Growth Mindset', description: 'Instilling resilience and continuous learning habits.' }] },
      achievements: data.achievements ? [{ year: new Date().getFullYear().toString(), title: data.achievements.split(',')[0], description: data.achievements }] : [{ year: new Date().getFullYear().toString(), title: 'Dedicated Educator', description: 'Recognized for teaching excellence.' }],
      contact: { email: data.email || 'contact@school.edu', phone: data.phone, location: 'School Campus' },
    };

    try {
      await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await fetch('/api/build', { method: 'POST' });
      setDownloadUrl(`/api/download?name=${encodeURIComponent(data.name || 'Teacher')}&_=${Date.now()}`);
      if (user?.id) setPublicUrl(`/s/${user.id}`);
      setBuilt(true);
      addBot('Your website has been generated!');
    } catch (e: any) {
      addBot(`Error: ${e.message}`);
    } finally { setBuilding(false); }
  };

  const handleDeploy = async () => {
    setDeployStatus('deploying');
    try {
      const r = await fetch('/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacherId: user?.id, name: data.name }) });
      const j = await r.json();
      if (j.url) { setDeployStatus('done'); setDeployUrl(j.url); addBot(`Your site is live at:\n${j.url}`); }
      else { setDeployStatus('error'); addBot(j.message || 'Deploy failed.'); }
    } catch { setDeployStatus('error'); addBot('Deploy failed.'); }
  };

  const progressPct = isComplete(data) ? 90 : Math.min(80, (Object.values(data).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length / 8) * 80);

  if (!authChecked) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#94a3b8' }}>Loading...</div>;

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#090d16', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
        <header style={{ padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Logo size={38} /><span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>TeacherFolio</span></div>
          <Link href="/" style={{ fontSize: '.9rem', color: '#94a3b8', textDecoration: 'none' }}>← Return Home</Link>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 48, maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>Sign In Required</h1>
            <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 32 }}>To build your teacher portfolio, please sign in or create an account.</p>
            <button onClick={() => setIsAuthOpen(true)} style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>Sign In or Register Now</button>
          </div>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#090d16', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      <header style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff' }}><Logo size={32} /><span style={{ fontWeight: 800, fontSize: '1.05rem' }}>TeacherFolio</span></Link>
        <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,0.15)' }} />
        <Link href="/" style={{ fontSize: '.85rem', color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>← Home</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '.8rem', color: '#a5b4fc', fontWeight: 600 }}>👤 {user.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 240 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 999, transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#a5b4fc', minWidth: 32 }}>{Math.round(progressPct)}%</span>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', scrollBehavior: 'smooth' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
              {m.role === 'bot' && <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>🤖</div>}
              <div style={{ maxWidth: '82%', padding: '14px 20px', borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', background: m.role === 'user' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#1e293b', color: '#fff', fontSize: '.95rem', lineHeight: 1.6, border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)', boxShadow: m.role === 'user' ? '0 4px 16px rgba(99,102,241,0.3)' : '0 2px 8px rgba(0,0,0,0.2)', whiteSpace: 'pre-wrap' }}>
                {m.role === 'bot' ? <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} /> : m.text}
              </div>
            </div>
          ))}

          {dataCollected && !built && (
            <>
              {/* Category filter & search */}
              <div style={{ marginLeft: 48, marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 8px', color: '#f8fafc' }}>🎨 Choose from {allThemes.length} themes</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <button onClick={() => { setThemeCategory(null); setThemeSearch(''); }} style={{ padding: '5px 12px', borderRadius: 999, border: `1px solid ${!themeCategory ? '#6366f1' : 'rgba(255,255,255,0.15)'}`, background: !themeCategory ? 'rgba(99,102,241,0.2)' : 'transparent', color: !themeCategory ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>All</button>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setThemeCategory(themeCategory === cat ? null : cat)} style={{ padding: '5px 12px', borderRadius: 999, border: `1px solid ${themeCategory === cat ? categoryColors[cat] || '#6366f1' : 'rgba(255,255,255,0.15)'}`, background: themeCategory === cat ? `${categoryColors[cat] || '#6366f1'}33` : 'transparent', color: themeCategory === cat ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <input value={themeSearch} onChange={e => setThemeSearch(e.target.value)} placeholder="Search themes..." style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Theme grid */}
              <div style={{ marginLeft: 48, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {displayedThemes.map(t => {
                  const isSelected = data.theme === t.id;
                  return (
                    <button key={t.id} onClick={() => selectTheme(t.id)} style={{ padding: '10px 12px', border: `2px solid ${isSelected ? '#818cf8' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, background: isSelected ? 'rgba(99,102,241,0.2)' : '#1e293b', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.accent})`, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    </button>
                  );
                })}
              </div>
              {filteredThemes.length > 30 && !showAllThemes && (
                <button onClick={() => setShowAllThemes(true)} style={{ marginLeft: 48, marginBottom: 16, padding: '8px 16px', background: 'transparent', color: '#818cf8', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
                  Show all {filteredThemes.length} themes →
                </button>
              )}

              {/* Summary & Generate */}
              <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, marginTop: 16, marginLeft: 48 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 16px', color: '#fff' }}>📋 Portfolio Summary</h3>
                {(() => {
                  const sel = allThemes.find(t => t.id === data.theme);
                  const sum = getSummary({ ...data, theme: sel?.name || data.theme || 'Modern' }, [{ id: sel?.id || '', label: sel?.name || data.theme || 'Modern' }]);
                  return sum.map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '.85rem' }}>
                      <span style={{ fontWeight: 600, color: '#818cf8', minWidth: 100, flexShrink: 0 }}>{label}</span>
                      <span style={{ color: '#cbd5e1' }}>{value}</span>
                    </div>
                  ));
                })()}
                <button onClick={handleGenerate} disabled={building} style={{ width: '100%', padding: 14, marginTop: 20, background: building ? '#475569' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '1rem', cursor: building ? 'not-allowed' : 'pointer' }}>
                  {building ? 'Generating...' : '🚀 Generate My Website'}
                </button>
              </div>
            </>
          )}

          {built && <BuildSuccess name={data.name} downloadUrl={downloadUrl} deployUrl={deployUrl} publicUrl={publicUrl} deployStatus={deployStatus} onDeploy={handleDeploy} />}

          <div ref={endRef} />
        </div>
      </main>

      {!dataCollected && (
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0f172a', padding: '16px 24px', flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <CallPanel teacherName={data.name || 'Teacher'} />
            <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} placeholder="Type naturally — I'll figure out what you mean..." style={{ flex: 1, padding: '14px 20px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', fontSize: '.95rem', outline: 'none' }} />
            <button onClick={handleSend} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer', fontSize: '.95rem', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>Send</button>
          </div>
        </footer>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
    </div>
  );
}
