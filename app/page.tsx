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
    { title: 'Chat Builder', desc: 'Answer a few questions and get a complete portfolio site in minutes.' },
    { title: '8 Themes', desc: 'Pick from curated color schemes and font pairings. Switch anytime.' },
    { title: 'ZIP Export', desc: 'Download a standalone HTML/CSS/JS bundle. Host anywhere.' },
    { title: 'One-Click Deploy', desc: 'Push live to Vercel with your own URL instantly.' },
  ];

  const steps = [
    { n: '01', title: 'Tell us about yourself', desc: 'Name, subject, experience, bio.' },
    { n: '02', title: 'Pick a theme', desc: 'Choose from 8 themes and preview live.' },
    { n: '03', title: 'Publish or download', desc: 'Deploy to Vercel or grab a ZIP.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', color: '#e2e8f0', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim { animation: fadeUp 0.6s ease both; }
        .a1 { animation-delay: 0.1s; }
        .a2 { animation-delay: 0.2s; }
        .a3 { animation-delay: 0.3s; }
        .a4 { animation-delay: 0.4s; }
      `}</style>

      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(10,13,20,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Logo size={30} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.3px' }}>TeacherFolio</span>
          </Link>
          <nav style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Link href="/build" style={{ padding: '6px 14px', color: '#94a3b8', textDecoration: 'none', fontSize: '.85rem', fontWeight: 500, borderRadius: 8 }}>Build</Link>
            <Link href="/cms" style={{ padding: '6px 14px', color: '#94a3b8', textDecoration: 'none', fontSize: '.85rem', fontWeight: 500, borderRadius: 8 }}>CMS</Link>
            {user ? (
              <span style={{ fontSize: '.82rem', color: '#a5b4fc', fontWeight: 600, padding: '6px 14px', background: 'rgba(99,102,241,0.12)', borderRadius: 8 }}>{user.name}</span>
            ) : (
              <button onClick={() => setIsAuthOpen(true)} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
            )}
          </nav>
        </div>
      </header>

      <section style={{ padding: '140px 24px 80px', textAlign: 'center', maxWidth: 750, margin: '0 auto' }}>
        <div style={{ padding: '4px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 999, fontSize: '.78rem', fontWeight: 600, color: '#a5b4fc', marginBottom: 28, display: 'inline-block' }} className="anim a1">
          Teacher Portfolio Builder
        </div>
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 18 }} className="anim a2">
          Your teaching website.<br />
          <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ready in minutes.</span>
        </h1>
        <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 32px' }} className="anim a3">
          No coding required. Answer a few questions and get a standalone portfolio site you can download or publish live.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }} className="anim a4">
          <Link href="/build" style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: '.95rem', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
            Start Building
          </Link>
          <Link href="/cms" style={{ padding: '14px 32px', color: '#e2e8f0', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: '.95rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            Explore CMS
          </Link>
        </div>
      </section>

      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#818cf8', padding: '3px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: 999 }}>How it works</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: 10, letterSpacing: '-0.5px' }}>Three simple steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: '28px 24px' }}>
                <span style={{ fontSize: '.7rem', fontWeight: 800, color: '#818cf8', letterSpacing: '1px' }}>{s.n}</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '8px 0 6px' }}>{s.title}</h3>
                <p style={{ fontSize: '.85rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#818cf8', padding: '3px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: 999 }}>Features</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: 10, letterSpacing: '-0.5px' }}>Everything you need</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14, padding: '22px 20px' }}>
                <h3 style={{ fontSize: '.95rem', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{f.title}</h3>
                <p style={{ fontSize: '.82rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 12 }}>Ready to build yours?</h2>
          <p style={{ fontSize: '.9rem', color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>Free to start. No credit card required.</p>
          <Link href="/build" style={{ padding: '14px 36px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: '1rem', boxShadow: '0 8px 24px rgba(99,102,241,0.35)', display: 'inline-block' }}>
            Get Started
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '24px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo size={20} />
            <span style={{ fontSize: '.82rem', color: '#475569', fontWeight: 600 }}>TeacherFolio</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/build" style={{ fontSize: '.8rem', color: '#64748b', textDecoration: 'none' }}>Build</Link>
            <Link href="/cms" style={{ fontSize: '.8rem', color: '#64748b', textDecoration: 'none' }}>CMS</Link>
          </div>
          <p style={{ fontSize: '.78rem', color: '#475569', margin: 0 }}>&copy; 2026 TeacherFolio</p>
        </div>
      </footer>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={(u) => setUser(u)} />
    </div>
  );
}