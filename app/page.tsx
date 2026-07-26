'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #eef2ff 0%, #faf5ff 40%, #f8fafc 100%)', color: '#1e293b', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={36} />
          <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px', color: '#0f172a' }}>TeacherFolio</span>
        </div>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/cms" style={{ padding: '10px 18px', color: '#475569', fontWeight: 600, textDecoration: 'none', fontSize: '.9rem', transition: 'color 0.2s' }}>
            CMS Dashboard
          </Link>
          <Link href="/build" style={{ padding: '11px 22px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: '.9rem', boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}>
            Create Portfolio ✨
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: '60px auto 0', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 999, fontSize: '.85rem', fontWeight: 600, color: '#4f46e5', marginBottom: 24, boxShadow: '0 2px 6px rgba(99,102,241,0.05)' }}>
          <span>✨</span> Interactive Chat-Powered Portfolio Generator
        </div>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-1px' }}>
          Build Your Professional<br />
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Teacher Website</span>
          {' '}in Minutes
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Have a friendly conversation with our assistant. Share your subjects, courses, and philosophy,
          then get a stunning, standalone website ready to download or deploy instantly.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/build" style={{ padding: '16px 36px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', borderRadius: 14, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem', boxShadow: '0 8px 24px rgba(99,102,241,0.4)', transition: 'transform 0.2s' }}>
            🚀 Start Building Now
          </Link>
          <Link href="/cms" style={{ padding: '16px 36px', background: '#fff', color: '#1e293b', borderRadius: 14, fontWeight: 700, textDecoration: 'none', fontSize: '1.05rem', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            Open CMS Dashboard →
          </Link>
        </div>
      </section>

      {/* Preview Card Mockup */}
      <section style={{ maxWidth: 960, margin: '60px auto 0', padding: '0 24px' }}>
        <div style={{ background: '#1e293b', borderRadius: 20, padding: '12px 12px 0 12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', gap: 6, padding: '4px 8px 12px 8px', alignItems: 'center' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: '#94a3b8', background: '#0f172a', padding: '2px 16px', borderRadius: 6 }}>teacher-portfolio.vercel.app</span>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: '12px 12px 0 0', padding: '40px 32px', textAlign: 'left', minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>SJ</div>
              <div>
                <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px' }}>Mathematics Educator</span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 0' }}>Sarah Johnson, M.Ed.</h2>
              </div>
            </div>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, maxWidth: 600, margin: '0 0 20px' }}>
              Empowering students to discover the beauty of mathematics through hands-on problem solving, collaborative inquiry, and real-world applications.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['Algebra II', 'AP Calculus', 'Geometry Honors'].map(c => (
                <span key={c} style={{ padding: '6px 14px', background: '#e0e7ff', color: '#4338ca', borderRadius: 8, fontSize: '.8rem', fontWeight: 600 }}>📖 {c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ maxWidth: 1100, margin: '100px auto 0', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Everything You Need to Shine Online</h2>
          <p style={{ fontSize: '1.05rem', color: '#64748b', maxWidth: 500, margin: '0 auto' }}>Designed specifically for teachers who want a professional web presence without the technical headache.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {[
            { icon: '💬', title: 'Guided Chat Interview', desc: 'Answer 9 conversational questions about your teaching career. Our assistant formats everything into a professional layout.' },
            { icon: '🎨', title: '8 Professional Themes', desc: 'Choose from Modern, Warm, Academic, Creative, Minimal, Emerald, Sunset, or Cyber STEM with custom typography and color palettes.' },
            { icon: '📦', title: 'Instant ZIP Download', desc: 'Get a clean, standalone bundle of HTML, CSS, and JS. Host it on GitHub Pages, Netlify, or your school server.' },
            { icon: '🚀', title: 'One-Click Live Deploy', desc: 'Deploy directly to Vercel with your own personalized project name and live URL in seconds.' },
            { icon: '📖', title: 'Interactive Courses', desc: 'Showcase your classes, grade levels, and syllabi so students and parents know what to expect.' },
            { icon: '⚙️', title: 'Advanced CMS Control', desc: 'Fine-tune every heading, statistic, SEO meta tag, and image using our powerful 11-tab admin dashboard.' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 20 }}>{f.icon}</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>{f.title}</h3>
              <p style={{ fontSize: '.95rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#fff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', margin: '100px 0 0', padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.5px' }}>Simple 3-Step Process</h2>
        <p style={{ fontSize: '1.05rem', color: '#64748b', marginBottom: 60 }}>From blank screen to live portfolio in under 5 minutes.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, maxWidth: 1000, margin: '0 auto' }}>
          {[
            { step: '01', title: 'Chat with Assistant', desc: 'Share your name, teaching philosophy, courses, and achievements through our conversational wizard.' },
            { step: '02', title: 'Pick Your Style', desc: 'Select your preferred visual theme, font pairing, and color accent to match your teaching personality.' },
            { step: '03', title: 'Download or Deploy', desc: 'Generate your website instantly. Download the ZIP package or deploy live with one click.' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: 36, textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#cbd5e1', marginBottom: 16, lineHeight: 1 }}>{s.step}</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>{s.title}</h3>
              <p style={{ fontSize: '.95rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section style={{ textAlign: 'center', padding: '100px 24px', background: 'radial-gradient(circle at 50% 100%, #eef2ff 0%, #f8fafc 70%)' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.5px' }}>Ready to showcase your teaching excellence?</h2>
        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>Join educators worldwide building stunning professional portfolios today.</p>
        <Link href="/build" style={{ padding: '18px 44px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', borderRadius: 16, fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(99,102,241,0.45)', display: 'inline-block' }}>
          🚀 Start Building Your Portfolio
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e8f0', padding: '32px 40px', textAlign: 'center', fontSize: '.85rem', color: '#94a3b8', background: '#fff' }}>
        TeacherFolio — Empowering educators with beautiful web portfolios.
      </footer>
    </div>
  );
}
