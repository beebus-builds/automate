'use client';

import { useState, useRef, useEffect } from 'react';

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

type Step = 'name' | 'subject' | 'years' | 'bio' | 'courses' | 'quote' | 'achievements' | 'contact' | 'theme' | 'done';

const stepLabels: Record<Step, string> = {
  name: 'Your Name',
  subject: 'Subject',
  years: 'Experience',
  bio: 'About You',
  courses: 'Courses',
  quote: 'Philosophy',
  achievements: 'Achievements',
  contact: 'Contact',
  theme: 'Theme',
  done: 'Done',
};

interface Msg {
  role: 'bot' | 'user';
  text: string;
}

export default function ChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [years, setYears] = useState('');
  const [bio, setBio] = useState('');
  const [courses, setCourses] = useState<string[]>([]);
  const [courseInput, setCourseInput] = useState('');
  const [quote, setQuote] = useState('');
  const [achievements, setAchievements] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [inputVal, setInputVal] = useState('');
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [deployStatus, setDeployStatus] = useState('');
  const [deployUrl, setDeployUrl] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    if (msgs.length === 0) {
      setTimeout(() => {
        setMsgs([{ role: 'bot', text: "👋 Hi! I'm your portfolio assistant. I'll help you create a beautiful teacher website step by step.\n\nLet's start — **what's your full name?**" }]);
      }, 400);
    }
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  const addBot = (text: string) => setMsgs(p => [...p, { role: 'bot', text }]);
  const addUser = (text: string) => setMsgs(p => [...p, { role: 'user', text }]);

  const next = (newStep: Step, botMsg: string) => {
    setStep(newStep);
    setTimeout(() => addBot(botMsg), 300);
  };

  const handleSend = () => {
    const val = inputVal.trim();
    if (!val) return;
    addUser(val);
    setInputVal('');

    switch (step) {
      case 'name':
        setName(val);
        next('subject', `Great, **${val}**! What subject(s) do you teach?`);
        break;
      case 'subject':
        setSubject(val);
        next('years', `**${val}** — wonderful! How many years have you been teaching?`);
        break;
      case 'years':
        setYears(val);
        next('bio', `**${val} years** — impressive! Tell me about yourself. What makes your teaching style unique?`);
        break;
      case 'bio':
        setBio(val);
        next('courses', 'Thanks! Now list the courses you teach. Type one and press **Add**, or just type them all separated by commas.');
        break;
      case 'quote':
        setQuote(val);
        next('achievements', 'Love it! Any achievements, awards, or certifications you\'d like to highlight?');
        break;
      case 'achievements':
        setAchievements(val);
        next('contact', 'Almost done! What **email** and **phone number** should people use to reach you?');
        break;
    }
  };

  const addCourse = () => {
    if (!courseInput.trim()) return;
    addUser(courseInput.trim());
    const updated = [...courses, courseInput.trim()];
    setCourses(updated);
    setCourseInput('');
    if (updated.length >= 2) {
      setTimeout(() => {
        addBot(`Got ${updated.length} courses! Now — what's a teaching quote or philosophy you believe in?`);
        setStep('quote');
      }, 400);
    } else {
      setTimeout(() => addBot('Got it! Add another course, or type **done** to move on.'), 300);
    }
  };

  const handleCourseDone = () => {
    if (courses.length === 0) {
      addUser('(skipped)');
      setStep('quote');
      setTimeout(() => addBot("No problem! What's a teaching quote or philosophy you believe in?"), 300);
    }
  };

  const handleContactSend = () => {
    const parts = inputVal.split(',').map(s => s.trim());
    const e = parts[0] || '';
    const p = parts[1] || '';
    setEmail(e);
    setPhone(p);
    addUser(inputVal);
    setInputVal('');
    setStep('theme');
    setTimeout(() => {
      const themeGrid = themes.map(t => `<div class="theme-chat-btn" data-id="${t.id}"><span class="theme-dot" style="background:${t.primary}"></span><span class="theme-dot" style="background:${t.accent}"></span><span>${t.label}</span></div>`).join('');
      addBot(`All set! Finally — **pick a theme** for your portfolio. Click one below.`);
    }, 400);
  };

  const selectTheme = (id: string) => {
    setSelectedTheme(id);
    addUser(themes.find(t => t.id === id)?.label || id);
    setStep('done');
    setTimeout(() => {
      addBot(`🎉 **You're all set!** Here's a quick summary of your portfolio. Click **Generate My Website** to build it.`);
    }, 500);
  };

  const handleGenerate = async () => {
    setBuilding(true);
    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const courseList = courses.length > 0 ? courses.map(c => ({ icon: '📖', title: c, description: `Engaging ${c.toLowerCase()} lessons for every learner.`, level: 'All Levels' })) : [{ icon: '📖', title: subject || 'My Subject', description: `Engaging ${subject ? subject.toLowerCase() : ''} education.`, level: 'All Levels' }];

    const data = {
      theme: { name: selectedTheme, layout: 'wide', heroStyle: 'centered' },
      style: { fontPair: 'modern-sans', roundness: 'rounded', shadowDepth: 'soft', spacing: 'normal', headerFixed: true, buttonStyle: 'rounded', sectionStyle: 'bordered' },
      site: { title: `${name} — Teacher Portfolio` },
      seo: { metaTitle: `${name} — Teacher Portfolio`, metaDesc: bio.slice(0, 160), ogImage: '', googleAnalytics: '' },
      hero: { tagline: `${subject} Educator`, title: 'Empowering Every Learner', highlight: 'Every Learner', description: bio, initials, heroImage: '' },
      about: { lead: bio, paragraphs: ['I believe every student has unique potential.', 'My classroom is built on curiosity, respect, and growth.'], stats: [{ number: years || '10', suffix: '+', label: 'Years Experience' }, { number: '500', suffix: '+', label: 'Students Mentored' }, { number: courses.length.toString() || '3', suffix: '', label: 'Subjects Taught' }] },
      courses: courseList,
      philosophy: { quote: quote || 'Education is not the filling of a pail, but the lighting of a fire.', attribution: '— William Butler Yeats', points: [{ title: 'Student-Centered', description: 'Focusing on individual needs and potential.' }, { title: 'Inclusive Classroom', description: 'A safe space for all learners.' }, { title: 'Real-World Learning', description: 'Connecting lessons to life.' }, { title: 'Growth Mindset', description: 'Embracing continuous improvement.' }] },
      achievements: achievements ? [{ year: new Date().getFullYear().toString(), title: achievements.split(',')[0], description: achievements }] : [{ year: new Date().getFullYear().toString(), title: 'Dedicated Educator', description: 'Committed to student success.' }],
      contact: { email, phone, location: '' },
    };

    try {
      await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const buildRes = await fetch('/api/build', { method: 'POST' });
      const buildJson = await buildRes.json();
      setDownloadUrl(`/api/download?name=${encodeURIComponent(name)}&_=${Date.now()}`);
      setBuilt(true);
      addBot(`✅ **Your portfolio is ready!** Click below to download or deploy it.`);
    } catch (e: any) {
      addBot(`❌ Something went wrong: ${e.message}`);
    } finally {
      setBuilding(false);
    }
  };

  const handleDeploy = async () => {
    setDeployStatus('deploying');
    try {
      const r = await fetch(`/api/deploy?name=${encodeURIComponent(name)}`, { method: 'POST' });
      const j = await r.json();
      if (j.url) {
        setDeployStatus('done');
        setDeployUrl(j.url);
        addBot(`🚀 **${name}'s site is live!**\nYour unique URL:\n${j.url}`);
        window.open(j.url, '_blank');
      } else {
        setDeployStatus('error');
        addBot(`⚠️ ${j.message || 'Deployment failed'}`);
      }
    } catch {
      setDeployStatus('error');
      addBot('❌ Deployment failed. Try downloading the ZIP instead.');
    }
  };

  const progressPct = (Object.keys(stepLabels).indexOf(step) / (Object.keys(stepLabels).length - 1)) * 100;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: '1.2rem' }}>🍎</span>
        <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Teacher Portfolio Builder</span>
        {step !== 'done' && (
          <div style={{ flex: 1, maxWidth: 300, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.65rem', color: '#94a3b8', marginBottom: 2 }}>
              <span>Progress</span><span>{Math.round(progressPct)}%</span>
            </div>
            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: '#6366f1', borderRadius: 2, transition: 'width .4s' }} />
            </div>
          </div>
        )}
        {step === 'done' && built && <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: 999 }}>✅ Portfolio Ready</span>}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16, animation: 'fadeIn .3s' }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 16px',
                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.role === 'user' ? '#6366f1' : '#fff',
                color: m.role === 'user' ? '#fff' : '#1e293b',
                fontSize: '.9rem',
                lineHeight: 1.6,
                border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                boxShadow: m.role === 'user' ? '0 2px 8px rgba(99,102,241,.25)' : '0 1px 3px rgba(0,0,0,.04)',
                whiteSpace: 'pre-wrap',
              }}>
                {m.role === 'bot' ? <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} /> : m.text}
              </div>
            </div>
          ))}

          {/* Theme picker */}
          {step === 'theme' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {themes.map(t => (
                <button key={t.id} onClick={() => selectTheme(t.id)}
                  style={{ padding: '8px 14px', border: `2px solid ${selectedTheme === t.id ? '#6366f1' : '#e2e8f0'}`, borderRadius: 10, background: selectedTheme === t.id ? 'rgba(99,102,241,.08)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', transition: 'all .15s' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: t.primary, display: 'inline-block' }} />
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: t.accent, display: 'inline-block' }} />
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Course input */}
          {step === 'courses' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input ref={inputRef} value={courseInput} onChange={e => setCourseInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCourse(); }} placeholder="Type a course name..." style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none' }} />
                <button onClick={addCourse} style={{ padding: '10px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '.8rem' }}>Add</button>
                <button onClick={handleCourseDone} style={{ padding: '10px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '.8rem' }}>Skip →</button>
              </div>
              {courses.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {courses.map((c, i) => <span key={i} style={{ padding: '4px 10px', background: 'rgba(99,102,241,.1)', color: '#4f46e5', borderRadius: 999, fontSize: '.75rem', fontWeight: 600 }}>{c}</span>)}
                </div>
              )}
            </div>
          )}

          {/* Summary + Generate */}
          {step === 'done' && !built && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginTop: 8 }}>
              <h3 style={{ fontSize: '.9rem', fontWeight: 700, margin: '0 0 12px' }}>📋 Portfolio Summary</h3>
              {[
                ['Name', name],
                ['Subject', subject],
                ['Experience', years + ' years'],
                ['Bio', bio],
                ['Courses', courses.join(', ') || subject],
                ['Quote', quote || '—'],
                ['Achievements', achievements || '—'],
                ['Contact', `${email}${phone ? ' · ' + phone : ''}`],
                ['Theme', themes.find(t => t.id === selectedTheme)?.label],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.82rem' }}>
                  <span style={{ fontWeight: 600, color: '#475569', minWidth: 100, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: '#1e293b' }}>{value}</span>
                </div>
              ))}
              <button onClick={handleGenerate} disabled={building} style={{ width: '100%', padding: 12, marginTop: 16, background: building ? '#94a3b8' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '.95rem', cursor: building ? 'not-allowed' : 'pointer' }}>
                {building ? '⏳ Generating...' : '🚀 Generate My Website'}
              </button>
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <a href="/cms" style={{ fontSize: '.78rem', color: '#6366f1', textDecoration: 'none' }}>Or edit in advanced CMS →</a>
              </div>
            </div>
          )}

          {/* Download + Deploy */}
          {built && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginTop: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px' }}>{name}'s Portfolio is Ready!</h3>
              {deployUrl ? (
                <p style={{ fontSize: '.82rem', color: '#059669', marginBottom: 8 }}>
                  ✅ Live at: <a href={deployUrl} target="_blank" style={{ color: '#059669', fontWeight: 600 }}>{deployUrl}</a>
                </p>
              ) : (
                <p style={{ fontSize: '.82rem', color: '#64748b', marginBottom: 16 }}>Download as ZIP or deploy live.</p>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={downloadUrl} download
                  style={{ padding: '11px 24px', background: '#6366f1', color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '.85rem' }}>
                📦 {name.split(' ')[0]}'s Portfolio.zip
                </a>
                <a href="/_site" target="_blank"
                  style={{ padding: '11px 24px', background: '#f1f5f9', color: '#475569', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: '.85rem' }}>
                👁 Preview Site
                </a>
                <button onClick={handleDeploy} disabled={deployStatus === 'deploying'}
                  style={{ padding: '11px 24px', background: '#059669', color: '#fff', borderRadius: 10, fontWeight: 700, border: 'none', cursor: deployStatus === 'deploying' ? 'not-allowed' : 'pointer', fontSize: '.85rem' }}>
                  {deployStatus === 'deploying' ? '⏳ Deploying...' : '🚀 Deploy Live'}
                </button>
              </div>
              {deployStatus === 'error' && <p style={{ fontSize: '.75rem', color: '#ef4444', marginTop: 8 }}>Deployment failed. Use the ZIP instead.</p>}
              <div style={{ marginTop: 12 }}>
                <a href="/cms" style={{ fontSize: '.78rem', color: '#6366f1', textDecoration: 'none' }}>Fine-tune in CMS →</a>
                <span style={{ color: '#cbd5e1', margin: '0 8px' }}>·</span>
                <button onClick={() => { setBuilt(false); setDeployUrl(''); setStep('name'); setMsgs([]); }} style={{ fontSize: '.78rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Start Over</button>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Input bar */}
      {step !== 'courses' && step !== 'theme' && step !== 'done' && (
        <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '12px 24px', flexShrink: 0 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 8 }}>
            <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { if (step === 'contact') handleContactSend(); else handleSend(); } }} placeholder={step === 'contact' ? 'email@example.com, phone number' : 'Type your answer...'} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none' }} />
            <button onClick={step === 'contact' ? handleContactSend : handleSend} style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .theme-chat-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border:2px solid #e2e8f0; border-radius:10px; background:#fff; cursor:pointer; font-size:.8rem; }
        .theme-chat-btn:hover { border-color:#6366f1; }
        .theme-dot { width:14px; height:14px; border-radius:50%; display:inline-block; }
      `}</style>
    </div>
  );
}
