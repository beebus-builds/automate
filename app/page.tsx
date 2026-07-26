'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.5rem' }}>🍎</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>TeacherFolio</span>
        </div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/build" style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '.9rem' }}>
            Create Your Portfolio
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1000, margin: '60px auto 0', padding: '0 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📚</div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.15 }}>
          Your Professional<br />
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Teacher Portfolio</span>
          {' '}in Minutes
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#475569', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.7 }}>
          Answer a few questions in a friendly chat, pick a theme, and get a beautiful
          live website with your courses, philosophy, achievements — ready to share.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/build" style={{ padding: '16px 40px', background: '#6366f1', color: '#fff', borderRadius: 12, fontWeight: 800, textDecoration: 'none', fontSize: '1rem', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }}>
            🚀 Start Building
          </Link>
          <Link href="/cms" style={{ padding: '16px 40px', background: '#fff', color: '#475569', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: '1rem', border: '1px solid #e2e8f0' }}>
            Advanced CMS →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: '80px auto 0', padding: '0 40px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {[
            { icon: '💬', title: 'Chat-Powered Setup', desc: 'Answer 9 simple questions in a natural conversation. No forms, no fuss.' },
            { icon: '🎨', title: '8 Unique Themes', desc: 'Modern, Warm, Academic, Creative, Minimal, Emerald, Sunset, or Cyber STEM.' },
            { icon: '📦', title: 'Download as ZIP', desc: 'Get a complete standalone website — HTML, CSS, JS — ready to host anywhere.' },
            { icon: '🚀', title: 'One-Click Deploy', desc: 'Push live to Vercel with a single click. Each teacher gets their own unique URL.' },
            { icon: '📖', title: 'Course Catalog', desc: 'List all your courses with descriptions. Perfect for students to browse.' },
            { icon: '🏆', title: 'Achievements & Awards', desc: 'Highlight your certifications, awards, and teaching milestones.' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>{f.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{f.title}</h3>
              <p style={{ fontSize: '.85rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '60px 40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 40px' }}>How It Works</h2>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
          {[
            { step: '1', title: 'Chat with Us', desc: 'Tell us your name, subject, experience, and more in a friendly conversation.' },
            { step: '2', title: 'Pick a Theme', desc: 'Choose from 8 professionally designed visual themes.' },
            { step: '3', title: 'Generate & Share', desc: 'Download your site as ZIP or deploy it live to the web instantly.' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '1 1 200px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', margin: '0 auto 12px' }}>{s.step}</div>
              <h3 style={{ fontSize: '.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{s.title}</h3>
              <p style={{ fontSize: '.82rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '60px 40px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Ready to create yours?</h2>
        <p style={{ fontSize: '.95rem', color: '#64748b', marginBottom: 24 }}>It takes less than 5 minutes.</p>
        <Link href="/build" style={{ padding: '14px 36px', background: '#6366f1', color: '#fff', borderRadius: 12, fontWeight: 800, textDecoration: 'none', fontSize: '1rem', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }}>
          🚀 Start Building
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e8f0', padding: '24px 40px', textAlign: 'center', fontSize: '.8rem', color: '#94a3b8' }}>
        TeacherFolio — Built for educators everywhere
      </footer>
    </div>
  );
}
