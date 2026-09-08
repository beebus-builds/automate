'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => { if (d.user) setUser(d.user); }).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const features = [
    { title: 'Chat Builder', desc: 'Answer a few questions — including your photos — and get a complete portfolio site in minutes.', icon: '💬' },
    { title: 'Visual Studio', desc: 'Elementor-style drag & drop: widgets, sections, layouts, live canvas.', icon: '🎨' },
    { title: '1,000+ Themes', desc: 'Curated color schemes & font pairings. Switch anytime — from minimal to bold.', icon: '🖌' },
    { title: 'ZIP Export', desc: 'Download a standalone HTML/CSS/JS bundle. Host anywhere — no server needed.', icon: '📦' },
    { title: 'One-Click Deploy', desc: 'Push live to Vercel with your own URL instantly.', icon: '🚀' },
    { title: 'Photo Galleries', desc: 'Upload classroom moments in chat — they become gallery sections automatically.', icon: '🖼' },
    { title: 'Inbox & Analytics', desc: 'Visitor messages, booking requests and per-page view stats in one dashboard.', icon: '📊' },
    { title: 'Blog & Bookings', desc: 'Publish articles and take office-hour appointments right from your site.', icon: '📅' },
    { title: 'AI Polish', desc: 'One-click rewrite for bios, quotes and posts — powered by your local model.', icon: '✨' },
  ];

  const steps = [
    { n: '01', title: 'Tell us about yourself', desc: 'Name, subject, experience, bio — all in natural chat.', icon: '📝' },
    { n: '02', title: 'Pick a theme', desc: 'Choose from 1,000+ themes and preview live.', icon: '🎯' },
    { n: '03', title: 'Publish or download', desc: 'Deploy to Vercel or grab a standalone ZIP.', icon: '📤' },
  ];

  return (
    <div className="min-h-screen bg-surface-950 text-slate-200 font-sans">
      <div className="ambient-glow top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-500" />
      <div className="ambient-glow bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500" />

      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'glass-strong' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center no-underline text-white">
            <Logo size={30} wordmark />
          </Link>
          <nav className="flex gap-1.5 items-center">
            <Link href="/build" className="px-3.5 py-1.5 text-slate-400 no-underline text-sm font-medium rounded-lg hover:text-white hover:bg-white/5 transition-colors">Build</Link>
            <Link href="/studio" className="px-3.5 py-1.5 text-slate-400 no-underline text-sm font-medium rounded-lg hover:text-white hover:bg-white/5 transition-colors">🎨 Studio</Link>
            <Link href="/directory" className="px-3.5 py-1.5 text-slate-400 no-underline text-sm font-medium rounded-lg hover:text-white hover:bg-white/5 transition-colors">Directory</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="px-3.5 py-1.5 text-slate-400 no-underline text-sm font-medium rounded-lg hover:text-white hover:bg-white/5 transition-colors">📊 Dashboard</Link>
                <span className="text-xs font-semibold text-brand-300 px-3 py-1.5 bg-brand-500/10 rounded-lg">{user.name}</span>
              </>
            ) : (
              <button onClick={() => setIsAuthOpen(true)} className="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">Sign In</button>
            )}
          </nav>
        </div>
      </header>

      <section className="pt-[180px] pb-[80px] px-6 max-w-3xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-xs font-semibold text-brand-300 mb-7 animate-fade-up">
          Teacher Portfolio Builder
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-[-2px] mb-5 animate-fade-up animation-delay-100">
          Your teaching website.<br />
          <span className="bg-gradient-to-br from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Ready in minutes.</span>
        </h1>
        <p className="text-base text-slate-400 leading-relaxed max-w-lg mx-auto mb-8 animate-fade-up animation-delay-200">
          No coding required. Answer a few questions and get a standalone portfolio site you can download or publish live.
        </p>
        <div className="flex gap-3 justify-center flex-wrap animate-fade-up animation-delay-300">
          <Link href="/build" className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all no-underline">
            Start Building — Live Preview as You Chat
          </Link>
        </div>

        <div className="mt-20 max-w-xl mx-auto text-left animate-fade-up animation-delay-300">
          <div className="glass-strong rounded-3xl p-5 shadow-glow">
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 text-[0.65rem] font-semibold text-slate-500">teacherfolio — builder</span>
            </div>
            <div className="flex gap-2.5 mb-3.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-xs shadow-md shadow-brand-500/20">🤖</div>
              <div className="bg-surface-700 text-white px-4 py-2.5 rounded-2xl rounded-tl-md text-xs leading-relaxed border border-white/[0.06] max-w-[85%]">
                Hi there! To start — <strong>what&apos;s your full name?</strong>
              </div>
            </div>
            <div className="flex gap-2.5 mb-3.5 justify-end">
              <div className="bg-gradient-to-br from-brand-500 to-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-md text-xs border border-transparent shadow-lg shadow-brand-500/15">
                Sarah Johnson — I teach math 🧮
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-xs shadow-md shadow-brand-500/20">🤖</div>
              <div className="bg-surface-700 text-white px-4 py-2.5 rounded-2xl rounded-tl-md text-xs leading-relaxed border border-white/[0.06] max-w-[85%]">
                <span className="text-brand-300 font-bold">Sarah Johnson</span> — lovely! What subject do you teach? <span className="inline-block w-2 h-3.5 bg-brand-400/70 ml-0.5 align-middle animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[72px] px-6 border-t border-white/[0.04] relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-[0.65rem] font-bold uppercase tracking-[1.5px] text-brand-400 px-3 py-1 bg-brand-500/10 rounded-full mb-4">Made for educators</span>
            <h2 className="text-2xl font-extrabold text-white tracking-[-0.5px]">Whatever you teach</h2>
            <p className="text-sm text-slate-500 mt-2">Sections and themes adapt to any subject or grade level.</p>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {['Mathematics', 'Science', 'English', 'History', 'Art & Design', 'Music', 'Physics', 'Computer Science', 'Languages', 'Physical Education', 'Chemistry', 'Biology'].map((s) => (
              <span key={s} className="px-4 py-2 text-xs font-semibold text-slate-300 border border-white/10 bg-white/[0.03] rounded-full hover:bg-white/[0.07] hover:border-white/20 transition-colors cursor-default">{s}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[72px] px-6 border-t border-white/[0.04] relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-[0.65rem] font-bold uppercase tracking-[1.5px] text-brand-400 px-3 py-1 bg-brand-500/10 rounded-full mb-4">How it works</span>
            <h2 className="text-2xl font-extrabold text-white tracking-[-0.5px]">Three simple steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="glass rounded-2xl p-7 hover:bg-white/[0.04] transition-colors group animate-fade-up" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                <span className="text-2xl mb-3 block">{s.icon}</span>
                <span className="text-[0.65rem] font-bold text-brand-400 tracking-[1px]">{s.n}</span>
                <h3 className="text-sm font-bold text-white mt-2 mb-1.5">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[72px] px-6 border-t border-white/[0.04] relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { num: '1,000+', label: 'Themes' },
              { num: '10k+', label: 'Sites Built' },
              { num: '5 min', label: 'Average Build Time' },
              { num: '100%', label: 'Free to Start' },
            ].map((s, i) => (
              <div key={i} className="glass rounded-2xl p-6 text-center hover:bg-white/[0.04] transition-colors">
                <div className="text-2xl font-black text-gradient mb-1">{s.num}</div>
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[72px] px-6 border-t border-white/[0.04] relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-[0.65rem] font-bold uppercase tracking-[1.5px] text-brand-400 px-3 py-1 bg-brand-500/10 rounded-full mb-4">Features</span>
            <h2 className="text-2xl font-extrabold text-white tracking-[-0.5px]">Everything you need</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div key={i} className="glass rounded-2xl p-6 hover:bg-white/[0.04] transition-colors group animate-fade-up" style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
                <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform">{f.icon}</span>
                <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[72px] px-6 border-t border-white/[0.04] relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-[0.65rem] font-bold uppercase tracking-[1.5px] text-brand-400 px-3 py-1 bg-brand-500/10 rounded-full mb-4">Themes</span>
            <h2 className="text-2xl font-extrabold text-white tracking-[-0.5px]">A look for every teacher</h2>
            <p className="text-sm text-slate-500 mt-2">A few styles from the 1,000+ theme library. Switch anytime.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: 'Midnight Scholar', bg: 'linear-gradient(135deg, #0f172a, #1e293b)', accent: '#6366f1' },
              { name: 'Warm Classroom', bg: 'linear-gradient(135deg, #431407, #7c2d12)', accent: '#fb923c' },
              { name: 'Academic Serif', bg: 'linear-gradient(135deg, #1c1917, #44403c)', accent: '#e7c873' },
              { name: 'Creative Pop', bg: 'linear-gradient(135deg, #4a044e, #831843)', accent: '#ec4899' },
            ].map((t) => (
              <Link key={t.name} href="/build" className="glass rounded-2xl overflow-hidden hover:bg-white/[0.04] transition-colors group no-underline">
                <div className="h-32 relative" style={{ background: t.bg }}>
                  <div className="absolute top-3 left-3 right-3 h-2 rounded-full bg-white/15" />
                  <div className="absolute top-7 left-3 w-2/3 h-2.5 rounded-full" style={{ background: t.accent }} />
                  <div className="absolute top-11 left-3 w-1/2 h-2 rounded-full bg-white/15" />
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    <span className="w-8 h-5 rounded" style={{ background: t.accent }} />
                    <span className="w-8 h-5 rounded border border-white/25 bg-transparent" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">{t.name}</h3>
                  <p className="text-xs text-slate-500">Preview in the builder →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[72px] px-6 border-t border-white/[0.04] relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-[0.65rem] font-bold uppercase tracking-[1.5px] text-brand-400 px-3 py-1 bg-brand-500/10 rounded-full mb-4">FAQ</span>
            <h2 className="text-2xl font-extrabold text-white tracking-[-0.5px]">Common questions</h2>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { q: 'Do I need to know how to code?', a: 'No. Answer a few chat questions about yourself and the builder generates the whole site — pages, styling, contact form and all.' },
              { q: 'What do I get when I publish?', a: 'A fast multi-page website (Home, About, Courses, Philosophy, Achievements, Contact) on a public address carrying your name, e.g. yourname.vercel.app.' },
              { q: 'Can I edit my site after building it?', a: 'Yes. Open your live site while signed in and use the "Edit this page" panel — saving rebuilds the pages instantly.' },
              { q: 'Can I use my own domain or hosting?', a: 'Yes. Download the site as a ZIP bundle of plain HTML, CSS and JavaScript and host it anywhere — no server or database required.' },
              { q: 'Is it free?', a: 'Yes, free to start with no credit card required. Publishing uses included hosting.' },
            ].map((f) => (
              <details key={f.q} className="glass rounded-xl px-5 py-4 group">
                <summary className="text-sm font-bold text-white cursor-pointer list-none flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-brand-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="text-xs text-slate-400 leading-relaxed mt-2.5">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[80px] px-6 text-center relative z-10">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-extrabold text-white tracking-[-0.5px] mb-3">Ready to build yours?</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">Free to start. No credit card required.</p>
          <Link href="/build" className="inline-flex items-center gap-2 px-9 py-4 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all no-underline">
            Get Started
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] px-6 py-5 relative z-10">
           <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Logo size={18} />
              <span className="text-xs text-slate-500 font-semibold">TeacherFolio</span>
            </div>
            <div className="flex gap-5">
              <Link href="/build" className="text-xs text-slate-500 no-underline hover:text-slate-300 transition-colors">Build</Link>
              <Link href="/fractal" className="text-xs text-slate-500 no-underline hover:text-slate-300 transition-colors">Fractal</Link>
            </div>
            <p className="text-xs text-slate-600 m-0">&copy; 2026 TeacherFolio</p>
          </div>
        </footer>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={(u) => setUser(u)} />
    </div>
  );
}
