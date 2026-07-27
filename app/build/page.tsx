'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';

const themes = [
  { id: 'modern', label: 'Modern Indigo', primary: '#4f46e5', accent: '#059669' },
  { id: 'warm', label: 'Warm Amber', primary: '#d97706', accent: '#b45309' },
  { id: 'academic', label: 'Academic Navy', primary: '#1e3a8a', accent: '#1e40af' },
  { id: 'creative', label: 'Creative Magenta', primary: '#db2777', accent: '#c026d3' },
  { id: 'minimal', label: 'Minimal Slate', primary: '#0f172a', accent: '#334155' },
  { id: 'emerald', label: 'Emerald Forest', primary: '#047857', accent: '#059669' },
  { id: 'sunset', label: 'Sunset Orange', primary: '#ea580c', accent: '#7c3aed' },
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

export default function BuildPage() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [tokenSavedMsg, setTokenSavedMsg] = useState('');

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'bot',
      text: "👋 Hi! I'm your **TeacherFolio AI Assistant**. I'll guide you step-by-step to build a stunning, professional teacher website.\n\nLet's get started — **what is your full name?**",
    },
  ]);
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

  // Load user & chat state on mount
  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then(async (data) => {
        setAuthChecked(true);
        if (data.user) {
          setUser(data.user);
          setCustomToken(data.user.vercel_token || '');
          // Load chat state
          const chatRes = await fetch('/api/chat');
          const chatData = await chatRes.json();
          if (chatData.state && chatData.state.messages?.length > 0) {
            setMsgs(chatData.state.messages);
            setStep(chatData.state.step || 'name');
            if (chatData.state.data) {
              const d = chatData.state.data;
              if (d.name) setName(d.name);
              if (d.subject) setSubject(d.subject);
              if (d.years) setYears(d.years);
              if (d.bio) setBio(d.bio);
              if (d.courses) setCourses(d.courses);
              if (d.quote) setQuote(d.quote);
              if (d.achievements) setAchievements(d.achievements);
              if (d.email) setEmail(d.email);
              if (d.phone) setPhone(d.phone);
              if (d.theme) setSelectedTheme(d.theme);
            }
          }
        }
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Save chat state when messages or step change (if logged in)
  useEffect(() => {
    if (user && msgs.length > 1) {
      const stateData = { name, subject, years, bio, courses, quote, achievements, email, phone, theme: selectedTheme };
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, step, data: stateData }),
      }).catch(() => {});
    }
  }, [msgs, step]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, step]);

  useEffect(() => {
    if (user) {
      inputRef.current?.focus();
    }
  }, [step, user]);

  const addBot = (text: string) => setMsgs((p) => [...p, { role: 'bot', text }]);
  const addUser = (text: string) => setMsgs((p) => [...p, { role: 'user', text }]);

  const next = (newStep: Step, botMsg: string) => {
    setStep(newStep);
    setTimeout(() => addBot(botMsg), 250);
  };

  const handleSend = () => {
    const val = inputVal.trim();
    if (!val) return;
    addUser(val);
    setInputVal('');

    switch (step) {
      case 'name':
        setName(val);
        next('subject', `Awesome to meet you, **${val}**! What subject or grade levels do you teach?`);
        break;
      case 'subject':
        setSubject(val);
        next('years', `**${val}** — fantastic! How many years have you been teaching?`);
        break;
      case 'years':
        setYears(val);
        next('bio', `**${val} years** of experience is incredible! Tell me briefly about yourself and your teaching approach.`);
        break;
      case 'bio':
        setBio(val);
        next('courses', 'Thank you! Now list the courses you teach. Type them one by one or separated by commas.');
        break;
      case 'quote':
        setQuote(val);
        next('achievements', 'Inspiring philosophy! Any awards, certifications, or career achievements you want to highlight?');
        break;
      case 'achievements':
        setAchievements(val);
        next('contact', 'Great! What **email address** and **phone number** should students/parents use to reach you?');
        break;
      case 'contact':
        handleContactSubmit(val);
        break;
    }
  };

  const handleContactSubmit = (val: string) => {
    const parts = val.split(',').map((s) => s.trim());
    setEmail(parts[0] || val);
    setPhone(parts[1] || '');
    setStep('theme');
    setTimeout(() => {
      addBot(`All set! Finally — **choose a visual theme** for your portfolio from the options below:`);
    }, 300);
  };

  const addCourse = () => {
    if (!courseInput.trim()) return;
    const added = courseInput.trim();
    addUser(added);
    const updated = [...courses, added];
    setCourses(updated);
    setCourseInput('');

    if (updated.length >= 2) {
      setTimeout(() => {
        addBot(`Got ${updated.length} courses! Now — what is a teaching quote or core philosophy you live by?`);
        setStep('quote');
      }, 300);
    } else {
      setTimeout(() => addBot('Course added! Add another course, or click **Skip / Continue** when ready.'), 250);
    }
  };

  const handleCourseDone = () => {
    if (courses.length === 0) {
      addUser('(Skipped courses)');
    }
    setStep('quote');
    setTimeout(() => addBot("No problem! What is a teaching quote or core philosophy you live by?"), 300);
  };

  const selectTheme = (id: string) => {
    setSelectedTheme(id);
    const tName = themes.find((t) => t.id === id)?.label || id;
    addUser(`Selected theme: ${tName}`);
    setStep('done');
    setTimeout(() => {
      addBot(`🎉 **Your portfolio configuration is complete!** Review your details below and click **Generate My Website** when ready.`);
    }, 400);
  };

  const handleGenerate = async () => {
    setBuilding(true);
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'TP';

    const courseList =
      courses.length > 0
        ? courses.map((c) => ({
            icon: '📖',
            title: c,
            description: `Engaging ${c.toLowerCase()} instruction tailored for student growth.`,
            level: 'All Levels',
          }))
        : [
            {
              icon: '📖',
              title: subject || 'General Education',
              description: `Comprehensive ${subject || 'academic'} instruction.`,
              level: 'All Levels',
            },
          ];

    const data = {
      theme: { name: selectedTheme, layout: 'wide', heroStyle: 'centered' },
      style: {
        fontPair: 'modern-sans',
        roundness: 'rounded',
        shadowDepth: 'soft',
        spacing: 'normal',
        headerFixed: true,
        buttonStyle: 'rounded',
        sectionStyle: 'bordered',
      },
      site: { title: `${name} — Teacher Portfolio` },
      seo: {
        metaTitle: `${name} — Educator Portfolio`,
        metaDesc: bio.slice(0, 160) || `Professional portfolio of ${name}, ${subject} educator.`,
        ogImage: '',
        googleAnalytics: '',
      },
      hero: {
        tagline: `${subject || 'Educator'} Portfolio`,
        title: `Welcome to ${name}'s Classroom`,
        highlight: name,
        description: bio || 'Dedicated to inspiring students and fostering academic excellence.',
        initials,
        heroImage: '',
      },
      about: {
        lead: bio,
        paragraphs: [
          'I believe every student possesses unique talents waiting to be unlocked.',
          'My instructional approach centers on curiosity, critical thinking, and mutual respect.',
        ],
        stats: [
          { number: years || '5', suffix: '+', label: 'Years Teaching' },
          { number: '300', suffix: '+', label: 'Students Mentored' },
          { number: courses.length.toString() || '3', suffix: '', label: 'Subjects Taught' },
        ],
      },
      courses: courseList,
      philosophy: {
        quote: quote || 'Education is not the filling of a pail, but the lighting of a fire.',
        attribution: '— William Butler Yeats',
        points: [
          { title: 'Student-Centered', description: 'Tailoring lessons to accommodate diverse learning styles.' },
          { title: 'Active Engagement', description: 'Encouraging hands-on problem solving and discussion.' },
          { title: 'Growth Mindset', description: 'Instilling resilience and continuous learning habits.' },
        ],
      },
      achievements: achievements
        ? [{ year: new Date().getFullYear().toString(), title: achievements.split(',')[0], description: achievements }]
        : [{ year: new Date().getFullYear().toString(), title: 'Dedicated Educator', description: 'Recognized for teaching excellence.' }],
      contact: { email: email || 'contact@school.edu', phone, location: 'School Campus' },
    };

    try {
      await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await fetch('/api/build', { method: 'POST' });
      setDownloadUrl(`/api/download?name=${encodeURIComponent(name || 'Teacher')}&_=${Date.now()}`);
      setBuilt(true);
      addBot(`✅ **Portfolio Generated Successfully!** Preview your live site or download the ZIP bundle below.`);
    } catch (e: any) {
      addBot(`❌ Error generating site: ${e.message}`);
    } finally {
      setBuilding(false);
    }
  };

  const handleDeploy = async () => {
    setDeployStatus('deploying');
    try {
      const r = await fetch(`/api/deploy?name=${encodeURIComponent(name || 'Teacher')}`, { method: 'POST' });
      const j = await r.json();
      if (j.url) {
        setDeployStatus('done');
        setDeployUrl(j.url);
        addBot(`🚀 **Deployment Live!** Your personalized portfolio is hosted at:\n${j.url}`);
        window.open(j.url, '_blank');
      } else {
        setDeployStatus('error');
        addBot(`⚠️ ${j.message || 'Deployment failed.'}`);
      }
    } catch {
      setDeployStatus('error');
      addBot('❌ Deployment failed. You can still download the ZIP package.');
    }
  };

  const saveCustomToken = async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'token', vercel_token: customToken }),
      });
      if (res.ok) {
        setTokenSavedMsg('✅ Vercel Token saved to your account!');
        setTimeout(() => setTokenSavedMsg(''), 3000);
      }
    } catch {
      setTokenSavedMsg('❌ Failed to save token');
    }
  };

  const progressPct = ((Object.keys(stepLabels).indexOf(step) + 1) / Object.keys(stepLabels).length) * 100;

  if (!authChecked) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#94a3b8' }}>
        Loading your session...
      </div>
    );
  }

  // ENFORCE AUTHENTICATION BEFORE CHATTING
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#090d16', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
        <header style={{ padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size={38} />
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>TeacherFolio AI</span>
          </div>
          <Link href="/" style={{ fontSize: '.9rem', color: '#94a3b8', textDecoration: 'none' }}>← Return Home</Link>
        </header>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 48, maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>Sign In Required</h1>
            <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 32 }}>
              To start chatting with our AI assistant, memorize your conversation, and deploy your teacher portfolio, please sign in or create an account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => setIsAuthOpen(true)}
                style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
              >
                🔐 Sign In or Register Now
              </button>
              <Link href="/" style={{ padding: '12px 24px', background: 'transparent', color: '#94a3b8', textDecoration: 'none', fontSize: '.9rem', fontWeight: 600 }}>
                Back to Home
              </Link>
            </div>
          </div>
        </div>

        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={(u) => setUser(u)} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#090d16', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      {/* Header Bar */}
      <header style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff' }}>
          <Logo size={32} />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.3px' }}>TeacherFolio AI</span>
        </Link>
        <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,0.15)' }} />
        <Link href="/" style={{ fontSize: '.85rem', color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>← Home</Link>

        {/* Auth status & Vercel token button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '.8rem', color: '#a5b4fc', fontWeight: 600 }}>👤 {user.name} (Chat Saved)</span>
            <button onClick={() => setShowTokenModal(!showTokenModal)} style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>
              ⚙️ My Vercel Token
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 240, width: '100%' }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 999, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#a5b4fc', minWidth: 32 }}>{Math.round(progressPct)}%</span>
        </div>
      </header>

      {/* Vercel Token Modal / Drawer */}
      {showTokenModal && (
        <div style={{ background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#fff' }}>🔑 Personal Vercel Token:</span>
          <input
            type="password"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
            placeholder="Paste your vercel token here..."
            style={{ flex: 1, maxWidth: 360, padding: '8px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: '.85rem', outline: 'none' }}
          />
          <button onClick={saveCustomToken} style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: '.82rem', fontWeight: 700, cursor: 'pointer' }}>
            Save Token
          </button>
          {tokenSavedMsg && <span style={{ fontSize: '.8rem', color: '#34d399', fontWeight: 600 }}>{tokenSavedMsg}</span>}
          <button onClick={() => setShowTokenModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: 'auto' }}>✕</button>
        </div>
      )}

      {/* Main Chat Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', scrollBehavior: 'smooth' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
              {m.role === 'bot' && (
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                  🤖
                </div>
              )}
              <div
                style={{
                  maxWidth: '82%',
                  padding: '14px 20px',
                  borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#1e293b',
                  color: '#fff',
                  fontSize: '.95rem',
                  lineHeight: 1.6,
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: m.role === 'user' ? '0 4px 16px rgba(99,102,241,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.role === 'bot' ? (
                  <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}

          {/* Theme selection buttons */}
          {step === 'theme' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20, marginLeft: 48 }}>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id)}
                  style={{
                    padding: '12px 14px',
                    border: `2px solid ${selectedTheme === t.id ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 14,
                    background: selectedTheme === t.id ? 'rgba(99,102,241,0.25)' : '#1e293b',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '.85rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.primary }} />
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.accent }} />
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Course addition helper */}
          {step === 'courses' && (
            <div style={{ marginLeft: 48, marginBottom: 20, background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <input
                  ref={inputRef}
                  value={courseInput}
                  onChange={(e) => setCourseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCourse();
                  }}
                  placeholder="e.g. AP Calculus AB..."
                  style={{ flex: 1, padding: '12px 16px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: '.9rem', outline: 'none' }}
                />
                <button onClick={addCourse} style={{ padding: '12px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '.85rem' }}>
                  + Add Course
                </button>
              </div>
              {courses.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {courses.map((c, i) => (
                    <span key={i} style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 8, fontSize: '.8rem', fontWeight: 600 }}>
                      📖 {c}
                    </span>
                  ))}
                </div>
              )}
              <button onClick={handleCourseDone} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>
                Continue to Next Step →
              </button>
            </div>
          )}

          {/* Portfolio Summary Card */}
          {step === 'done' && !built && (
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, marginTop: 16, marginLeft: 48 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                📋 Portfolio Summary
              </h3>
              {[
                ['Name', name || 'Educator'],
                ['Subject', subject || 'Education'],
                ['Experience', `${years || '0'} years`],
                ['Bio', bio || '—'],
                ['Courses', courses.join(', ') || 'General Courses'],
                ['Quote', quote || '—'],
                ['Achievements', achievements || '—'],
                ['Contact', `${email || '—'} ${phone ? '· ' + phone : ''}`],
                ['Theme', themes.find((t) => t.id === selectedTheme)?.label || 'Modern'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '.85rem' }}>
                  <span style={{ fontWeight: 600, color: '#818cf8', minWidth: 100, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: '#cbd5e1' }}>{value}</span>
                </div>
              ))}
              <button onClick={handleGenerate} disabled={building} style={{ width: '100%', padding: 14, marginTop: 20, background: building ? '#475569' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '1rem', cursor: building ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                {building ? '⏳ Generating Portfolio Website...' : '🚀 Generate My Website'}
              </button>
            </div>
          )}

          {/* Download & Deploy Success Box */}
          {built && (
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: 32, marginTop: 20, textAlign: 'center', marginLeft: 48, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>{name || 'Teacher'}'s Website is Ready!</h3>
              {deployUrl ? (
                <p style={{ fontSize: '.9rem', color: '#34d399', marginBottom: 16 }}>
                  ✅ Live URL: <a href={deployUrl} target="_blank" style={{ color: '#34d399', fontWeight: 700, textDecoration: 'underline' }}>{deployUrl}</a>
                </p>
              ) : (
                <p style={{ fontSize: '.85rem', color: '#94a3b8', marginBottom: 20 }}>Download your standalone ZIP package or deploy live.</p>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={downloadUrl} download style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: '.9rem', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                  📦 Download ZIP Bundle
                </a>
                <a href="/site-preview" target="_blank" style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: '.9rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  👁 Live Local Preview
                </a>
                <button onClick={handleDeploy} disabled={deployStatus === 'deploying'} style={{ padding: '12px 24px', background: '#10b981', color: '#fff', borderRadius: 12, fontWeight: 700, border: 'none', cursor: deployStatus === 'deploying' ? 'not-allowed' : 'pointer', fontSize: '.9rem' }}>
                  {deployStatus === 'deploying' ? '⏳ Deploying...' : '🚀 Deploy Live'}
                </button>
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16, justifyContent: 'center', fontSize: '.8rem' }}>
                <Link href="/cms" style={{ color: '#818cf8', textDecoration: 'none' }}>Open in CMS Dashboard →</Link>
                <span style={{ color: '#475569' }}>|</span>
                <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Return Home</Link>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </main>

      {/* Fixed Bottom Input Bar */}
      {step !== 'courses' && step !== 'theme' && step !== 'done' && (
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0f172a', padding: '16px 24px', flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 12 }}>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder={step === 'contact' ? 'email@school.edu, phone number...' : 'Type your message...'}
              style={{ flex: 1, padding: '14px 20px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', fontSize: '.95rem', outline: 'none' }}
            />
            <button onClick={handleSend} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer', fontSize: '.95rem', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
              Send
            </button>
          </div>
        </footer>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={(u) => setUser(u)} />
    </div>
  );
}
