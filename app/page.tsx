'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>Teacher Portfolio</h1>
      <p style={{ fontSize: '1.05rem', color: '#94a3b8', marginBottom: 32, maxWidth: 480 }}>
        Full-stack teacher portfolio website generator. Edit everything in the CMS and export a static site with one click.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/cms" style={{ padding: '12px 28px', background: '#6366f1', color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '.95rem' }}>
          Open CMS →
        </Link>
        <a href="/_site" style={{ padding: '12px 28px', background: 'rgba(255,255,255,.1)', color: '#e2e8f0', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: '.95rem' }}>
          View Built Site
        </a>
      </div>
      <div style={{ marginTop: 48, display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { title: 'Visual CMS', desc: 'Edit all content via a clean dashboard UI' },
          { title: '8 Themes', desc: 'Modern, Warm, Academic and more' },
          { title: 'SQLite Backend', desc: 'Data persisted in a database' },
          { title: 'Live Preview', desc: 'See changes instantly as you type' },
          { title: 'Static Export', desc: 'Build a deployable static site' },
          { title: 'SEO Ready', desc: 'Meta tags, OG image, Google Analytics' },
        ].map((f, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '18px 20px', width: 180, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
