'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', overflowX: 'hidden' }}>
      {/* Ambient background glows */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '1000px', height: '500px', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.08) 50%, transparent 70%)', pointerEvents: 'none', filter: 'blur(80px)', zIndex: 0 }} />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, margin: '0 auto', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={38} />
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px', color: '#fff' }}>TeacherFolio</span>
        </div>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/cms" style={{ padding: '10px 18px', color: '#94a3b8', fontWeight: 600, textDecoration: 'none', fontSize: '.9rem', transition: 'color 0.2s' }}>
            CMS Dashboard
          </Link>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '.85rem', color: '#a5b4fc', fontWeight: 600 }}>👤 {user.name}</span>
              <button onClick={handleLogout} style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' }}>
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: '.9rem', fontWeight: 600, cursor: 'pointer' }}>
              Sign In
            </button>
          )}
          <Link href="/build" style={{ padding: '11px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: '.9rem', boxShadow: '0 0 25px rgba(99,102,241,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}>
            Create Portfolio ✨
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '80px auto 40px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999, fontSize: '.85rem', fontWeight: 600, color: '#a5b4fc', marginBottom: 28, boxShadow: '0 0 20px rgba(99,102,241,0.15)' }}>
          <span>✨</span> The AI-Powered Chat Portfolio for Educators
        </div>
        <h1 style={{ fontSize: 'clamp(2.75rem, 7vw, 4.5rem)', fontWeight: 900, color: '#fff', margin: '0 0 24px', lineHeight: 1.08, letterSpacing: '-1.5px' }}>
          Your Professional<br />
          <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Teacher Website</span>
          {' '}in Minutes
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: 680, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Chat with our friendly assistant, pick from 8 stunning themes, and get a blazing-fast,
          standalone portfolio ready to download or deploy live with your own custom URL.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/build" style={{ padding: '18px 40px', background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', color: '#fff', borderRadius: 16, fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(99,102,241,0.5)', transition: 'transform 0.2s' }}>
            🚀 Start Building Now
          </Link>
          <Link href="/cms" style={{ padding: '18px 36px', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', borderRadius: 16, fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
            Open CMS Dashboard →
          </Link>
        </div>
      </section>

      {/* Preview Card Mockup */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '60px auto 100px', padding: '0 24px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: '14px 14px 0 14px', boxShadow: '0 30px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: 8, padding: '6px 12px 16px 12px', alignItems: 'center' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.8)', padding: '4px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>sarah-johnson.vercel.app</span>
          </div>
          <div style={{ background: '#0f172a', borderRadius: '16px 16px 0 0', padding: '48px 40px', textAlign: 'left', minHeight: 340, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 800, boxShadow: '0 0 25px rgba(99,102,241,0.5)' }}>SJ</div>
              <div>
                <span style={{ fontSize: '.8rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Mathematics Department Chair</span>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: '4px 0 0', letterSpacing: '-0.5px' }}>Sarah Johnson, Ph.D.</h2>
              </div>
            </div>
            <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 680, margin: '0 0 28px' }}>
              Inspiring the next generation of problem solvers through inquiry-based learning, advanced calculus, and collaborative mathematical modeling.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['Algebra II Honors', 'AP Calculus BC', 'Linear Algebra', 'Math Club Advisor'].map(c => (
                <span key={c} style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 10, fontSize: '.85rem', fontWeight: 600 }}>📖 {c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15, 23, 42, 0.6)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, textAlign: 'center' }}>
          {[
            { stat: '100%', label: 'Standalone & Portable' },
            { stat: '8', label: 'Curated Theme Styles' },
            { stat: '< 5 min', label: 'Setup via Chat Wizard' },
            { stat: 'Instant', label: 'Vercel & ZIP Export' },
          ].map((st, i) => (
            <div key={i}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: 4, background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{st.stat}</div>
              <div style={{ fontSize: '.9rem', color: '#94a3b8', fontWeight: 500 }}>{st.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ maxWidth: 1200, margin: '120px auto 0', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-1px' }}>Engineered for Educators</h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: 540, margin: '0 auto' }}>Everything you need to establish a commanding, professional digital presence with zero code.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 28 }}>
          {[
            { icon: '💬', title: 'Guided Chat Interview', desc: 'Answer 9 quick questions in a natural dialogue. Our system formats your career milestones into an elite layout.' },
            { icon: '🎨', title: '8 Designer Themes', desc: 'From Academic Navy to Cyber STEM and Warm Sunset, switch themes instantly with curated typography.' },
            { icon: '📦', title: 'Portable ZIP Export', desc: 'Download a clean, production-ready bundle of HTML, CSS, and JS to host anywhere you choose.' },
            { icon: '🚀', title: 'Personalized Live Deploy', desc: 'Push directly to Vercel. Each teacher gets their own dedicated project and unique live URL.' },
            { icon: '📖', title: 'Course Showcase', desc: 'Highlight your syllabus, grade levels, and learning resources so students stay informed.' },
            { icon: '⚙️', title: '11-Tab Advanced CMS', desc: 'Fine-tune every heading, media asset, SEO tag, and color with our comprehensive dashboard.' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 36, backdropFilter: 'blur(10px)', transition: 'transform 0.2s, border-color 0.2s' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 24 }}>{f.icon}</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.3px' }}>{f.title}</h3>
              <p style={{ fontSize: '.95rem', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 1100, margin: '140px auto 0', padding: '0 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-1px' }}>Three Simple Steps</h2>
        <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: 60 }}>From conversation to live website in under five minutes.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {[
            { step: '01', title: 'Chat & Share', desc: 'Tell us your name, subject, bio, and courses through our intelligent interview assistant.' },
            { step: '02', title: 'Choose Style', desc: 'Select your visual aesthetic, typography pair, and color palette with instant live preview.' },
            { step: '03', title: 'Launch Live', desc: 'Download your standalone ZIP or deploy live to your own unique Vercel web address.' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 40, textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16, lineHeight: 1 }}>{s.step}</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>{s.title}</h3>
              <p style={{ fontSize: '.95rem', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section style={{ textAlign: 'center', padding: '140px 24px 100px', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '800px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(60px)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 900, color: '#fff', margin: '0 0 20px', letterSpacing: '-1px' }}>Ready to Elevate Your Teaching Brand?</h2>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', marginBottom: 40, lineHeight: 1.6 }}>Join educators worldwide building stunning professional web portfolios today.</p>
          <Link href="/build" style={{ padding: '20px 48px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', borderRadius: 16, fontWeight: 800, textDecoration: 'none', fontSize: '1.15rem', boxShadow: '0 12px 35px rgba(99,102,241,0.5)', display: 'inline-block' }}>
            🚀 Start Building Your Portfolio
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 48px', textAlign: 'center', fontSize: '.9rem', color: '#64748b', background: '#06090f' }}>
        TeacherFolio — Empowering educators with world-class digital portfolios.
      </footer>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={(u) => setUser(u)} />
    </div>
  );
}
