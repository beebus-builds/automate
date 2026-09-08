'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';
import { BuildSuccess } from '@/components/chat/BuildSuccess';
import { LivePreview } from '@/components/chat/LivePreview';
import { parseMessage, extractImages, generateResponse, getSummary, emptyData, TeacherData } from '@/lib/conversation';
import { getAllThemes, getCategories, categoryColors, searchThemes } from '@/lib/themes';
import { teacherDataToContent } from '@/lib/sitePayload';
import { recommendThemes } from '@/lib/recommend';
import { runAssistant, makeSectionFromTemplate, AssistantMemory } from '@/lib/assistant/engine';
import { SkeletonPage } from '@/components/Skeleton';

const allThemes = getAllThemes();
const categories = getCategories();

interface Msg {
  role: 'bot' | 'user';
  text: string;
  /** Optional attached image thumbnail (uploads / pasted photo links). */
  image?: string;
}

const IMAGE_URL_RE = /(https?:\/\/[^\s"'<>()]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s"'<>()]*)?|https?:\/\/(?:images\.unsplash\.com|unsplash\.com)[^\s"'<>()]*)/i;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

const PHOTO_QUESTION = `One more optional touch — do you have a **profile photo** for your site?\n\n📷 Upload one with the camera button below, paste an image link, or say **Skip**.`;

/** Ask the server-side model to read the message. Null → use the regex parser. */
async function llmExtract(message: string, current: TeacherData): Promise<Partial<TeacherData> | null> {
  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        current: {
          name: current.name, subject: current.subject, years: current.years,
          bio: current.bio, courses: current.courses, quote: current.quote,
          achievements: current.achievements, email: current.email, phone: current.phone,
        },
      }),
    });
    if (!res.ok) return null;
    const out = await res.json();
    return out?.extracted ?? null;
  } catch {
    return null;
  }
}

function isComplete(d: TeacherData): boolean {
  return !!(d.name && d.bio && (d.subject || d.courses.length) && d.years && d.quote);
}

function mdToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\n)\s*[-•]\s+/g, '$1<span class="bullet">•</span> ')
    .replace(/^["“”](.*?)["“”]/gm, '“$1”')
    .replace(/\n/g, '<br/>');
}

const BUILD_STEPS = ['Applying your theme…', 'Writing your sections…', 'Crafting your copy…', 'Packaging your site…'];

const COLLECTION_CHIPS: Record<string, string[]> = {
  'subject or courses you teach': ['Mathematics', 'Science', 'English', 'History'],
  'years of teaching experience': ['5 years', '10 years', '15+ years'],
  'the courses you teach': ['Algebra, Geometry, Calculus', 'Biology & Chemistry'],
  'bio or teaching philosophy': ['Hands-on lessons built around student curiosity', 'Inquiry-based learning where questions lead the way'],
  'a teaching quote or philosophy': ['“Education is the most powerful weapon”', '“Every student can learn, just not on the same day”'],
  'any awards or achievements': ['National Teaching Award, Board Certified', 'Best New Teacher 2023, Google Educator'],
  'contact email': ['teacher@school.edu'],
};

function collectionSuggestions(d: TeacherData): string[] {
  const missing: string[] = [];
  if (!d.name) missing.push('name');
  if (!d.subject && !d.courses.length) missing.push('subject or courses you teach');
  if (!d.years) missing.push('years of teaching experience');
  if (!d.bio && !d.quote) missing.push('bio or teaching philosophy');
  if (!d.courses.length) missing.push('the courses you teach');
  if (!d.quote) missing.push('a teaching quote or philosophy');
  if (!d.achievements) missing.push('any awards or achievements');
  if (!d.email) missing.push('contact email');
  const key = missing[0];
  return key ? (COLLECTION_CHIPS[key] || []) : [];
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
  const [buildStep, setBuildStep] = useState(0);
  const [built, setBuilt] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [deployUrl, setDeployUrl] = useState('');
  const [deployStatus, setDeployStatus] = useState('');
  const [themeSearch, setThemeSearch] = useState('');
  const [themeCategory, setThemeCategory] = useState<string | null>(null);
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [assistantMemory, setAssistantMemory] = useState<AssistantMemory>({ themeIds: [], themeIndex: 0, context: { turns: [], lastDirection: { colors: [], moods: [] }, recentSections: [] }, persona: { name: 'assistant', seen: {} } });
  const [showPreview, setShowPreview] = useState(true);
  // Photo step: 'idle' → 'asking' (bot asked for a profile photo) → 'done'
  const [photoStep, setPhotoStep] = useState<'idle' | 'asking' | 'done'>('idle');
  const [uploading, setUploading] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
            if (sd.state.memory) {
              setAssistantMemory({
                themeIds: [], themeIndex: 0,
                context: { turns: [], lastDirection: { colors: [], moods: [] }, recentSections: [] },
                persona: { name: 'assistant', seen: {} },
                ...sd.state.memory,
              });
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
        body: JSON.stringify({ messages: msgs, step: dataCollected ? 'done' : 'chatting', data, memory: assistantMemory }),
      }).catch(() => {});
    }
  }, [msgs, data, dataCollected, assistantMemory]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { if (user) inputRef.current?.focus(); }, [user, dataCollected]);

  const addBot = (text: string) => { setBotTyping(false); setMsgs(p => [...p, { role: 'bot', text }]); };
  const addUser = (text: string, image?: string) => setMsgs(p => [...p, { role: 'user', text, image }]);

  const completeCollection = (d: TeacherData) => {
    setDataCollected(true);
    setSuggestions([]);
    setPhotoStep('done');
    replyWithTyping('Great — I have everything I need! Your preview on the right is already taking shape ✨ You can pick a theme below, or just tell me in chat — e.g. **"a calm blue theme"**, **"rounded corners"**, or **"add a testimonials section"**.');
  };

  /** Upload a photo file → profile photo (or gallery if one exists). Returns the URL or null. */
  const uploadPhotoFile = async (file: File): Promise<string | null> => {
    if (file.size > MAX_PHOTO_BYTES) {
      replyWithTyping('That file is over 10MB — try a smaller image?');
      return null;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/media', { method: 'POST', body: fd });
      const out = await res.json().catch(() => null);
      if (!res.ok) throw new Error(out?.error || `upload failed (${res.status})`);
      return out.url as string;
    } catch (err: any) {
      replyWithTyping(`Upload failed: ${err?.message || 'try again'}. You can also paste an image link.`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Fresh-data ref so async upload callbacks never clobber newer chat state.
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const handlePhotoPicked = async (file: File) => {
    addUser(`Uploaded: ${file.name}`);
    const url = await uploadPhotoFile(file);
    if (!url) return;
    setMsgs(p => {
      const next = [...p];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'user' && !next[i].image) { next[i] = { ...next[i], image: url }; break; }
      }
      return next;
    });
    const cur = dataRef.current;
    const hadPhoto = !!cur.photo;
    const next = hadPhoto ? { ...cur, gallery: [...(cur.gallery || []), url] } : { ...cur, photo: url };
    setData(next);
    if (!dataCollected && photoStep === 'asking' && isComplete(next)) {
      setTimeout(() => completeCollection(next), 400);
    } else if (dataCollected) {
      setTimeout(() => replyWithTyping(hadPhoto ? 'Added to your gallery! 🖼 See it in the preview →' : 'Profile photo set! 📸 Looking sharp — see it in the preview →'), 400);
    } else {
      setTimeout(() => replyWithTyping(hadPhoto ? 'Added to your gallery! 🖼' : 'Profile photo saved! 📸'), 400);
    }
  };

  const handlePhotoUrlSubmit = () => {
    const url = photoUrlInput.trim();
    if (!IMAGE_URL_RE.test(url)) {
      replyWithTyping('That doesn\'t look like a direct image link (needs to end in .png, .jpg, .gif or .webp). Try uploading with the 📷 button instead?');
      return;
    }
    setPhotoUrlInput('');
    handleSend(url);
  };
  const replyWithTyping = (text: string, delay = 700) => {
    setBotTyping(true);
    setTimeout(() => addBot(text), delay);
  };

  const handleSend = (text?: string | MouseEvent) => {
    const val = (typeof text === 'string' ? text : inputVal).trim();
    if (!val) return;
    const imgMatch = val.match(IMAGE_URL_RE);
    addUser(val, imgMatch ? imgMatch[1] : undefined);
    setInputVal('');
    setSuggestions([]);

    // Photo-step answers (Skip / photo link) finish the collection flow.
    if (!dataCollected && photoStep === 'asking') {
      const updated = { ...data };
      if (imgMatch && !updated.photo) updated.photo = imgMatch[1];
      else if (imgMatch) updated.gallery = [...(updated.gallery || []), imgMatch[1]];
      setData(updated);
      setPhotoStep('done');
      if (imgMatch) {
        replyWithTyping('Profile photo saved! 📸 Your preview is already taking shape ✨ You can pick a theme below, or just tell me in chat — e.g. **"a calm blue theme"** or **"add a testimonials section"**.');
      } else {
        replyWithTyping('No problem — we\'ll skip the photo for now. (You can add one anytime with the 📷 button.) Your preview is already taking shape ✨ Pick a theme below, or tell me what you\'d like in chat!');
      }
      setDataCollected(true);
      return;
    }

    if (dataCollected) {
      // Image links & photo commands are handled directly (no AI round-trip needed).
      if (imgMatch) {
        const url = imgMatch[1];
        setData(p => {
          const had = !!p.photo;
          const next = had ? { ...p, gallery: [...(p.gallery || []), url] } : { ...p, photo: url };
          setTimeout(() => replyWithTyping(had ? 'Added to your gallery! 🖼 Watch the preview update →' : 'Profile photo set! 📸 Looking sharp — watch the preview update →'), 500);
          return next;
        });
        return;
      }
      if (/^(remove|delete)( my| the)? (profile |cover )?photos?$/i.test(val)) {
        setData(p => ({ ...p, photo: '' }));
        replyWithTyping('Profile photo removed. Upload a new one anytime with the 📷 button.');
        return;
      }
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

      if (res.memory) setAssistantMemory(res.memory);
      setSuggestions(res.suggestions || []);

      for (const a of res.actions) {
        if (a.type === 'theme') {
          setData(p => ({ ...p, theme: a.themeId }));
        } else if (a.type === 'style') {
          setData(p => ({ ...p, style: { ...(p.style || {}), ...a.patch } }));
        } else if (a.type === 'section' && a.op === 'add') {
          const base = a.section ?? makeSectionFromTemplate(a.templateId);
          // Personalize gallery sections with the teacher's own uploaded photos.
          const sec = (a.templateId === 'gallery' && (dataRef.current.gallery || []).length > 0)
            ? (() => {
                const photos = dataRef.current.gallery.slice(0, 8);
                return {
                  ...base,
                  blocks: photos.map((src: string, i: number) => ({
                    ...base.blocks[i % base.blocks.length],
                    id: `blk-${Date.now().toString(36)}-${i}`,
                    type: 'image' as const,
                    src,
                    alt: `Gallery photo ${i + 1}`,
                  })),
                };
              })()
            : base;
          setData(p => ({ ...p, customSections: [...(p.customSections || []), sec] }));
        } else if (a.type === 'section' && a.op === 'remove') {
          const id = a.sectionId;
          setData(p => ({ ...p, customSections: (p.customSections || []).filter(s => s.id !== id) }));
        }
      }

      replyWithTyping(res.text);

      if (res.build) {
        setTimeout(() => handleGenerate(), 900);
      }
      return;
    }

    void runCollectionTurn(val);
  };

  /** Collection phase: read the message with the model, fall back to regex. */
  const runCollectionTurn = async (val: string) => {
    setBotTyping(true);
    const llm = await llmExtract(val, data);
    // Re-read state: a photo upload may have landed while the model was working.
    const base = dataRef.current;
    // The model never handles image links — those stay a local, exact match.
    const extracted = llm ? { ...llm, ...extractImages(val, base) } : parseMessage(val, base).extracted;

    const updated = { ...base, ...extracted };
    if (extracted.courses) updated.courses = [...new Set([...base.courses, ...extracted.courses])];
    if (extracted.gallery) updated.gallery = [...new Set([...(base.gallery || []), ...extracted.gallery])];
    setData(updated);
    // The model round-trip already provided the "thinking" pause.
    const delay = llm ? 200 : 700;
    if (isComplete(updated)) {
      // Optional photo step before finishing (skippable, one-time).
      if (!updated.photo && photoStep === 'idle') {
        setPhotoStep('asking');
        setSuggestions(['Skip']);
        replyWithTyping(PHOTO_QUESTION, delay);
      } else {
        completeCollection(updated);
      }
    } else {
      replyWithTyping(generateResponse(updated, extracted), delay);
      setSuggestions(collectionSuggestions(updated));
    }
  };

  const restartConversation = () => {
    setMsgs([{ role: 'bot', text: "Hi there! I'll help you build a beautiful teacher portfolio website.\n\nTo start — **what's your full name?**" }]);
    setData(emptyData);
    setDataCollected(false);
    setAssistantMemory({ themeIds: [], themeIndex: 0, context: { turns: [], lastDirection: { colors: [], moods: [] }, recentSections: [] }, persona: { name: 'assistant', seen: {} } });
    setSuggestions([]);
    setInputVal('');
    setBuilt(false);
    setPhotoStep('idle');
    setPhotoUrlInput('');
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    setUser(null);
  };

  const selectTheme = (id: string) => {
    const theme = allThemes.find(t => t.id === id);
    if (!theme) return;
    addUser(`Selected: ${theme.name}`);
    setData(p => ({ ...p, theme: id }));
    replyWithTyping(`**${theme.name}** — great choice! Watch it update live on the right → then hit Generate when you're happy.`);
  };

  const handleGenerate = async () => {
    setBuilding(true);
    setBuildStep(0);
    const stepTimer = setInterval(() => setBuildStep(s => Math.min(s + 1, BUILD_STEPS.length - 1)), 900);
    const payload = teacherDataToContent(data);

    try {
      await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await fetch('/api/build', { method: 'POST' });
      clearInterval(stepTimer);
      setDownloadUrl(`/api/download?name=${encodeURIComponent(data.name || 'Teacher')}`);
      if (user?.id) setPublicUrl(`/s/${user.id}`);
      setBuilt(true);
      addBot('Your website has been generated! 🎉 Check the preview or open the live link.');
    } catch (e: any) {
      clearInterval(stepTimer);
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
      <header className="glass-strong border-b border-white/[0.06] px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center no-underline text-white">
          <Logo size={30} wordmark />
        </Link>
        <Link href="/" className="hidden sm:inline text-xs text-slate-500 no-underline font-medium hover:text-slate-200 transition-colors">← Home</Link>
        <Link href="/studio" className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-brand-200 border border-brand-500/30 bg-brand-500/10 no-underline hover:bg-brand-500/20 transition-colors">🎨 Studio</Link>
        <div className="hidden lg:flex items-center gap-2 ml-3 text-[0.68rem] text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live preview updates as you chat
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPreview(v => !v)}
            className={`lg:hidden px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${showPreview ? 'bg-white text-slate-900 border-white' : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'}`}
          >
            {showPreview ? '💬 Chat' : '👁 Preview'}
          </button>
          <button onClick={restartConversation} title="Start a fresh conversation" className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-white/10 bg-white/[0.03] hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-colors">↺ Restart</button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[0.7rem] font-black text-white flex-shrink-0 shadow-lg shadow-brand-500/25">{user.name?.slice(0, 1).toUpperCase() || 'T'}</div>
          <div className="min-w-0 hidden sm:block">
            <div className="text-xs font-semibold text-white truncate max-w-[120px]">{user.name}</div>
            <div className="text-[0.6rem] text-slate-500">{Math.round(progressPct)}% complete</div>
          </div>
          <div className="hidden sm:block h-1.5 w-16 bg-white/[0.06] rounded-full overflow-hidden flex-shrink-0">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <button onClick={logout} title="Sign out" className="w-8 h-8 rounded-xl text-xs text-slate-400 border border-white/10 bg-white/[0.03] hover:text-red-400 hover:border-red-400/30 transition-colors flex-shrink-0">⏻</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Chat pane */}
        <div className={`flex flex-col min-w-0 ${showPreview ? 'flex-1' : 'flex-1'} ${showPreview ? 'hidden lg:flex' : 'flex'} `}>
          <div className={`flex-1 overflow-y-auto p-4 sm:p-5 scroll-smooth ${showPreview ? 'lg:max-w-none' : ''}`}>
            <div className="max-w-[760px] mx-auto w-full">
              {msgs.map((m, i) => (
                <div key={i} className={`flex gap-3 mb-5 animate-fade-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'bot' && <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/25 text-sm">🤖</div>}
                  <div className={`max-w-[82%] px-5 py-3 rounded-2xl text-sm leading-relaxed border whitespace-pre-wrap ${m.role === 'user' ? 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white border-transparent shadow-lg shadow-brand-500/20' : 'bg-surface-700 text-white border border-white/[0.06] shadow-md shadow-black/20'}`}>
                    {m.image && (
                      <img src={m.image} alt="Shared photo" className="rounded-xl mb-2 max-h-48 w-auto object-cover border border-white/20" />
                    )}
                    {m.role === 'bot' ? <div dangerouslySetInnerHTML={{ __html: mdToHtml(m.text) }} /> : m.text}
                  </div>
                </div>
              ))}

              {photoStep === 'asking' && !dataCollected && (
                <div className="ml-10 mb-5 rounded-2xl border border-brand-500/30 bg-brand-500/[0.07] p-4 animate-fade-up">
                  <div className="text-sm font-bold text-white mb-1">📷 Add your profile photo</div>
                  <p className="text-xs text-slate-400 mb-3">Upload a headshot, paste an image link, or skip — your call.</p>
                  <div className="flex gap-2 flex-wrap items-center">
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                      {uploading ? 'Uploading…' : '📤 Upload photo'}
                    </button>
                    <input value={photoUrlInput} onChange={e => setPhotoUrlInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handlePhotoUrlSubmit(); }} placeholder="…or paste image link" className="flex-1 min-w-[160px] px-3 py-2 bg-surface-800 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-brand-500 placeholder:text-slate-500" />
                    <button onClick={() => handleSend('Skip')} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-white/10 hover:text-white hover:border-white/25 transition-colors">Skip</button>
                  </div>
                </div>
              )}

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

              {suggestions.length > 0 && !botTyping && (
                <div className="flex gap-2 flex-wrap mb-5 ml-10 animate-fade-up">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-brand-200 bg-brand-500/10 border border-brand-500/25 hover:bg-brand-500/20 hover:border-brand-500/50 hover:text-white transition-all cursor-pointer"
                    >
                      {s} →
                    </button>
                  ))}
                </div>
              )}

              {dataCollected && !built && (
                <>
                  <div className="mb-5">
                    <h3 className="text-sm font-extrabold text-white mb-3">🎨 Choose from {allThemes.length} themes <span className="font-normal text-slate-500 text-xs">— preview updates live →</span></h3>
                    <div className="flex gap-2 flex-wrap mb-3">
                      <button onClick={() => { setThemeCategory(null); setThemeSearch(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${!themeCategory ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-transparent text-slate-400 border border-white/10 hover:border-white/20'}`}>All</button>
                      {categories.map(cat => (
                        <button key={cat} onClick={() => setThemeCategory(themeCategory === cat ? null : cat)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${themeCategory === cat ? 'text-white border' : 'bg-transparent text-slate-400 border border-white/10 hover:border-white/20'}`} style={{ borderColor: `${categoryColors[cat] || '#6366f1'}80`, background: `${categoryColors[cat] || '#6366f1'}1a`, color: themeCategory === cat ? '#fff' : undefined }}>
                          {cat}
                        </button>
                      ))}
                    </div>
                    <input value={themeSearch} onChange={e => setThemeSearch(e.target.value)} placeholder="Search themes... preview updates instantly" className="w-full px-4 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-500" />
                  </div>

                  {recommendations.length > 0 && !themeSearch && !themeCategory && (
                    <div className="mb-5">
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

                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
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
                  {filteredThemes.length === 0 && (
                    <div className="mb-4 p-8 rounded-2xl border border-dashed border-white/10 text-center">
                      <div className="text-3xl mb-3">🔍</div>
                      <div className="text-sm font-semibold text-white mb-1">No themes match “{themeSearch}”</div>
                      <div className="text-xs text-slate-500 mb-4">Try a different keyword, or clear the search to browse all themes.</div>
                      <button onClick={() => { setThemeSearch(''); setThemeCategory(null); }} className="px-4 py-2 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5">Clear search</button>
                    </div>
                  )}
                  {filteredThemes.length > 30 && !showAllThemes && (
                    <button onClick={() => setShowAllThemes(true)} className="mb-4 px-4 py-2 bg-transparent text-brand-400 border border-brand-400/30 rounded-lg text-xs font-semibold hover:bg-brand-500/10 transition-colors">
                      Show all {filteredThemes.length} themes →
                    </button>
                  )}

                  <div className="glass rounded-2xl p-6 mt-4">
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
                    <button onClick={handleGenerate} disabled={building} className="w-full py-3.5 mt-5 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 inline-flex items-center justify-center gap-2">
                      {building ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          {BUILD_STEPS[buildStep]}
                        </>
                      ) : '🚀 Generate My Website'}
                    </button>
                    {building && (
                      <div className="mt-3 flex items-center gap-1.5 justify-center">
                        {BUILD_STEPS.map((s, i) => (
                          <span key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= buildStep ? 'bg-gradient-to-r from-brand-500 to-purple-500' : 'bg-white/[0.06]'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {built && <BuildSuccess name={data.name} downloadUrl={downloadUrl} deployUrl={deployUrl} publicUrl={publicUrl} deployStatus={deployStatus} onDeploy={handleDeploy} />}

              <div ref={endRef} />
            </div>
          </div>

          {!built && (
            <footer className="border-t border-white/[0.06] bg-surface-800 px-4 py-3 flex-shrink-0">
              <div className="max-w-[760px] mx-auto flex gap-2 sm:gap-3 items-center">
                <input ref={fileRef} type="file" accept={PHOTO_ACCEPT} hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handlePhotoPicked(f); }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload a photo" className="w-[46px] h-[46px] rounded-xl text-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/25 transition-all flex-shrink-0 disabled:opacity-40">
                  {uploading ? '⏳' : '📷'}
                </button>
                <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} placeholder={dataCollected ? "Ask me anything — “calm blue”, “add testimonials” or “build my site”..." : "Type naturally — I&apos;ll figure out what you mean..."} className="flex-1 min-w-0 px-4 py-3 bg-surface-700 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-500" />
                <button onClick={() => handleSend()} disabled={botTyping || !inputVal.trim()} className="px-5 sm:px-7 py-3 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 flex-shrink-0">Send</button>
              </div>
            </footer>
          )}
        </div>

        {/* Preview pane — always visible on desktop, toggleable on mobile */}
        <div className={`${showPreview ? 'flex' : 'hidden'} lg:flex w-full lg:w-[46%] xl:w-[52%] flex-col min-w-0 flex-shrink-0`}>
          <LivePreview data={data} />
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
    </div>
  );
}
