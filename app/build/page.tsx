'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';
import { BuildSuccess } from '@/components/chat/BuildSuccess';
import { CallPanel } from '@/components/chat/CallPanel';
import { parseMessage, generateResponse, getSummary, emptyData, TeacherData } from '@/lib/conversation';
import { getAllThemes, getCategories, categoryColors, searchThemes, mapThemeToBuildData } from '@/lib/themes';
import { recommendThemes } from '@/lib/recommend';
import { runAssistant, makeSectionFromTemplate, AssistantMemory } from '@/lib/assistant/engine';
import { SkeletonPage } from '@/components/Skeleton';

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
  const [botTyping, setBotTyping] = useState(false);
  const [assistantMemory, setAssistantMemory] = useState<AssistantMemory>({ themeIds: [], themeIndex: 0 });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredThemes = useMemo(() => searchThemes(themeSearch, themeCategory || undefined), [themeSearch, themeCategory]);
  const displayedThemes = useMemo(() => showAllThemes ? filteredThemes : filteredThemes.slice(0, 30), [filteredThemes, showAllThemes]);

  const recommendations = useMemo(() => {
    if (!dataCollected || !data.name) return [];
    return recommendThemes(data, 6);
  }, [dataCollected, data]);

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

  const addBot = (text: string) => { setBotTyping(false); setMsgs(p => [...p, { role: 'bot', text }]); };
  const addUser = (text: string) => setMsgs(p => [...p, { role: 'user', text }]);
  const replyWithTyping = (text: string, delay = 700) => {
    setBotTyping(true);
    setTimeout(() => addBot(text), delay);
  };

  const handleSend = () => {
    const val = inputVal.trim();
    if (!val) return;
    addUser(val);
    setInputVal('');

    if (dataCollected) {
      const sel = allThemes.find(t => t.id === data.theme);
      const res = runAssistant(val, {
        name: data.name,
        subject: data.subject,
        bio: data.bio,
        quote: data.quote,
        achievements: data.achievements,
        email: data.email,
        courses: data.courses,
        years: data.years,
        collected: true,
        currentThemeId: data.theme,
        currentThemeName: sel?.name,
        customSections: data.customSections || [],
        memory: assistantMemory,
      });

      // Persist memory for follow-ups (another one / undo / second one)
      if (res.memory) setAssistantMemory(res.memory);

      // Apply actions
      for (const a of res.actions) {
        if (a.type === 'theme') {
          setData(p => ({ ...p, theme: a.themeId }));
        } else if (a.type === 'style') {
          setData(p => ({ ...p, style: { ...(p.style || {}), ...a.patch } }));
        } else if (a.type === 'section' && a.op === 'add') {
          const sec = a.section ?? makeSectionFromTemplate(a.templateId);
          setData(p => ({ ...p, customSections: [...(p.customSections || []), sec] }));
        } else if (a.type === 'section' && a.op === 'remove') {
          const id = a.sectionId;
          setData(p => ({ ...p, customSections: (p.customSections || []).filter(s => s.id !== id) }));
        }
      }

      replyWithTyping(res.text);

      // Trigger build if requested
      if (res.build) {
        setTimeout(() => handleGenerate(), 900);
      }
      return;
    }

    const { extracted } = parseMessage(val, data);
    const updated = { ...data, ...extracted };
    if (extracted.courses) updated.courses = [...new Set([...data.courses, ...extracted.courses])];
    setData(updated);
    if (isComplete(updated)) {
      setDataCollected(true);
      replyWithTyping('Great — I have everything I need! You can pick a theme below, or tell me in chat what you\'d like — e.g. **"a calm blue theme"**, **"rounded corners"**, or **"add a testimonials section"**.');
    } else {
      replyWithTyping(generateResponse(updated, extracted));
    }
  };

  const selectTheme = (id: string) => {
    const theme = allThemes.find(t => t.id === id);
    if (!theme) return;
    addUser(`Selected: ${theme.name}`);
    setData(p => ({ ...p, theme: id }));
    replyWithTyping(`**${theme.name}** — great choice! Hit the button below to generate your site.`);
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
      style: { fontPair: theme?.fonts?.heading || 'Inter', roundness: theme?.layout?.roundness || 'rounded', shadowDepth: theme?.layout?.shadowDepth || 'soft', spacing: theme?.layout?.spacing || 'normal', headerFixed: true, buttonStyle: theme?.layout?.buttonStyle || 'rounded', sectionStyle: theme?.layout?.cardStyle === 'glass' ? 'glass' : 'bordered', ...(data.style || {}) },
      customSections: data.customSections || [],
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

  if (!authChecked) return <SkeletonPage />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-950 text-slate-200 font-sans">
        <header className="px-12 py-6 flex items-center justify-between max-w-[1280px] mx-auto w-full">
          <div className="flex items-center"><Logo size={38} wordmark /></div>
          <Link href="/" className="text-sm text-slate-400 no-underline">← Return Home</Link>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-surface-700 border border-white/[0.08] rounded-3xl p-12 max-w-[460px] w-full text-center shadow-2xl">
            <div className="text-[3.5rem] mb-4">🔒</div>
            <h1 className="text-2xl font-black text-white mb-3">Sign In Required</h1>
            <p className="text-base text-slate-400 leading-relaxed mb-8">To build your teacher portfolio, please sign in or create an account.</p>
            <button onClick={() => setIsAuthOpen(true)} className="px-6 py-4 bg-gradient-to-br from-brand-500 to-indigo-600 text-white border-none rounded-2xl font-bold text-sm cursor-pointer shadow-xl shadow-brand-500/40">Sign In or Register Now</button>
          </div>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface-950 text-slate-200 font-sans">
      <header className="glass-strong border-b border-white/[0.06] px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
        <Link href="/" className="flex items-center no-underline text-white">
          <Logo size={30} wordmark />
        </Link>
        <div className="w-4 h-4 rounded-full bg-white/10" />
        <Link href="/" className="text-xs text-slate-400 no-underline font-medium hover:text-slate-200 transition-colors">← Home</Link>
        <div className="ml-auto flex items-center gap-4 max-w-[260px]">
          <span className="text-xs font-semibold text-brand-300">👤 {user.name}</span>
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-[0.7rem] font-bold text-brand-300 w-7">{Math.round(progressPct)}%</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 scroll-smooth">
        <div className="max-w-[780px] mx-auto">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 mb-5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'bot' && <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/25 text-sm">🤖</div>}
              <div className={`max-w-[82%] px-5 py-3 rounded-2xl text-sm leading-relaxed border whitespace-pre-wrap ${m.role === 'user' ? 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white border-transparent shadow-lg shadow-brand-500/20' : 'bg-surface-700 text-white border border-white/[0.06] shadow-md shadow-black/20'}`}>
                {m.role === 'bot' ? <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} /> : m.text}
              </div>
            </div>
          ))}

          {botTyping && !built && (
            <div className="flex gap-3 mb-5 justify-start">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/25 text-sm">🤖</div>
              <div className="bg-surface-700 text-white px-5 py-3 rounded-2xl border border-white/[0.06] shadow-md shadow-black/20 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {dataCollected && !built && (
            <>
              <div className="ml-10 mb-5">
                <h3 className="text-sm font-extrabold text-white mb-3">🎨 Choose from {allThemes.length} themes</h3>
                <div className="flex gap-2 flex-wrap mb-3">
                  <button onClick={() => { setThemeCategory(null); setThemeSearch(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${!themeCategory ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-transparent text-slate-400 border border-white/10 hover:border-white/20'}`}>All</button>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setThemeCategory(themeCategory === cat ? null : cat)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${themeCategory === cat ? 'text-white border' : 'bg-transparent text-slate-400 border border-white/10 hover:border-white/20'}`} style={{ borderColor: `${categoryColors[cat] || '#6366f1'}80`, background: `${categoryColors[cat] || '#6366f1'}1a`, color: themeCategory === cat ? '#fff' : undefined }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <input value={themeSearch} onChange={e => setThemeSearch(e.target.value)} placeholder="Search themes..." className="w-full px-4 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-500" />
              </div>

              {recommendations.length > 0 && !themeSearch && !themeCategory && (
                <div className="ml-10 mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-extrabold text-white">✨ Recommended for you</span>
                    <span className="text-[0.6rem] text-slate-500">scored from your profile</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {recommendations.map(({ theme: t, score, reasons }) => {
                      const isSelected = data.theme === t.id;
                      const c = t.colors;
                      return (
                        <button key={t.id} onClick={() => selectTheme(t.id)} className={`p-2 rounded-xl text-left transition-all duration-150 hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-brand-400 shadow-lg shadow-brand-500/20' : 'border border-white/[0.06] hover:border-white/15'}`} style={{ background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent' }}>
                          <div className="rounded-lg overflow-hidden border border-white/10 mb-2" style={{ background: c.background }}>
                            <div className="px-2 py-1.5 flex items-center justify-between" style={{ background: c.surface }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.primary }} />
                              <span className="h-1 w-8 rounded-full" style={{ background: c.muted }} />
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.accent }} />
                            </div>
                            <div className="px-2 py-2">
                              <span className="block h-1.5 w-14 rounded-full mb-1.5" style={{ background: c.primary }} />
                              <span className="block h-1 w-10 rounded-full" style={{ background: c.muted }} />
                              <span className="block h-1 w-12 rounded-full mt-1.5" style={{ background: c.muted }} />
                            </div>
                            <div className="px-2 pb-2 flex gap-1">
                              <span className="h-1.5 flex-1 rounded-full" style={{ background: c.accent, opacity: 0.8 }} />
                              <span className="h-1.5 flex-1 rounded-full" style={{ background: c.muted, opacity: 0.5 }} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-1 pb-0.5">
                            <span className="text-xs font-semibold truncate">{t.name}</span>
                            <span className="text-[0.6rem] font-bold text-emerald-400 flex-shrink-0 ml-1">{score}%</span>
                          </div>
                          <div className="px-1 text-[0.6rem] text-slate-500 truncate">{reasons[0] || t.category}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="ml-10 mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayedThemes.map(t => {
                  const isSelected = data.theme === t.id;
                  const c = t.colors;
                  return (
                    <button key={t.id} onClick={() => selectTheme(t.id)} className={`p-2 rounded-xl text-left transition-all duration-150 hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-brand-400 shadow-lg shadow-brand-500/20' : 'border border-white/[0.06] hover:border-white/15'}`} style={{ background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent' }}>
                      <div className="rounded-lg overflow-hidden border border-white/10 mb-2" style={{ background: c.background }}>
                        <div className="px-2 py-1.5 flex items-center justify-between" style={{ background: c.surface }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.primary }} />
                          <span className="h-1 w-8 rounded-full" style={{ background: c.muted }} />
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.accent }} />
                        </div>
                        <div className="px-2 py-2">
                          <span className="block h-1.5 w-14 rounded-full mb-1.5" style={{ background: c.primary }} />
                          <span className="block h-1 w-10 rounded-full" style={{ background: c.muted }} />
                          <span className="block h-1 w-12 rounded-full mt-1.5" style={{ background: c.muted }} />
                        </div>
                        <div className="px-2 pb-2 flex gap-1">
                          <span className="h-1.5 flex-1 rounded-full" style={{ background: c.accent, opacity: 0.8 }} />
                          <span className="h-1.5 flex-1 rounded-full" style={{ background: c.muted, opacity: 0.5 }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-1 pb-0.5">
                        <span className="text-xs font-semibold truncate">{t.name}</span>
                        {isSelected && <span className="text-brand-300 text-xs">✓</span>}
                      </div>
                      <div className="px-1 text-[0.6rem] text-slate-500 truncate">{t.category}</div>
                    </button>
                  );
                })}
              </div>
              {filteredThemes.length > 30 && !showAllThemes && (
                <button onClick={() => setShowAllThemes(true)} className="ml-10 mb-4 px-4 py-2 bg-transparent text-brand-400 border border-brand-400/30 rounded-lg text-xs font-semibold hover:bg-brand-500/10 transition-colors">
                  Show all {filteredThemes.length} themes →
                </button>
              )}

              <div className="glass rounded-2xl p-6 mt-4 ml-10">
                <h3 className="text-sm font-extrabold text-white mb-4">📋 Portfolio Summary</h3>
                {(() => {
                  const sel = allThemes.find(t => t.id === data.theme);
                  const sum = getSummary({ ...data, theme: sel?.name || data.theme || 'Modern' }, [{ id: sel?.id || '', label: sel?.name || data.theme || 'Modern' }]);
                  return sum.map(([label, value]) => (
                    <div key={label} className="flex gap-3 py-2 border-b border-white/[0.04] text-sm">
                      <span className="font-semibold text-brand-300 w-[100px] flex-shrink-0">{label}</span>
                      <span className="text-slate-300">{value}</span>
                    </div>
                  ));
                })()}
                <button onClick={handleGenerate} disabled={building} className="w-full py-3.5 mt-5 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {building ? 'Generating...' : '🚀 Generate My Website'}
                </button>
              </div>
            </>
          )}

          {built && <BuildSuccess name={data.name} downloadUrl={downloadUrl} deployUrl={deployUrl} publicUrl={publicUrl} deployStatus={deployStatus} onDeploy={handleDeploy} />}

          <div ref={endRef} />
        </div>
      </main>

      {!built && (
        <footer className="border-t border-white/[0.06] bg-surface-800 px-5 py-3 flex-shrink-0">
          <div className="max-w-[720px] mx-auto flex gap-3 items-center">
            <CallPanel teacherName={data.name || 'Teacher'} />
            <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} placeholder={dataCollected ? "Ask me anything — theme, style, sections, or “build my site”..." : "Type naturally — I&apos;ll figure out what you mean..."} className="flex-1 px-4 py-3 bg-surface-700 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-500" />
            <button onClick={handleSend} disabled={botTyping || !inputVal.trim()} className="px-7 py-3 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0">Send</button>
          </div>
        </footer>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
    </div>
  );
}
