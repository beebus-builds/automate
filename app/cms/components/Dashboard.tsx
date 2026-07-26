'use client';

import React, { useState, useEffect } from 'react';
import { useCMS } from '../CMSContext';

export function Inp({ path, val, ph }: { path: string; val: string; ph?: string }) {
  const { update } = useCMS();
  return <input className="cms-input" value={val} onChange={e => update(path, e.target.value)} placeholder={ph} />;
}

export function TA({ path, val, ph }: { path: string; val: string; ph?: string }) {
  const { update } = useCMS();
  return <textarea className="cms-textarea" value={val} onChange={e => update(path, e.target.value)} placeholder={ph} />;
}

export function Dashboard() {
  const { data } = useCMS();
  const a = data.about || {};
  const stats = [
    { n: (data.courses || []).length, l: 'Courses' },
    { n: (data.achievements || []).length, l: 'Achievements' },
    { n: ((data.philosophy || {}).points || []).length, l: 'Principles' },
    { n: ((a.stats || []).reduce((s: number, st: any) => s + (parseInt(st.number) || 0), 0)), l: 'Total Stats' },
  ];
  const qa = [
    { tab: 'hero', icon: '✨', label: 'Edit Hero Section', desc: 'Tagline, title, description' },
    { tab: 'about', icon: '👤', label: 'Edit About Me', desc: 'Bio, stats, paragraphs' },
    { tab: 'courses', icon: '📖', label: 'Manage Courses', desc: 'Add/edit course offerings' },
    { tab: 'seo', icon: '🔍', label: 'SEO Settings', desc: 'Meta tags, analytics' },
    { tab: 'media', icon: '🖼', label: 'Media Library', desc: 'Upload and manage images' },
    { tab: 'theme', icon: '🎨', label: 'Themes & Style', desc: 'Customize appearance' },
  ];
  return (
    <div className="cms-panel">
      <div className="cms-panel__header"><h2>Dashboard</h2><p>Overview of your teacher portfolio.</p></div>
      <div className="dashboard__stats">
        {stats.map((s, i) => (
          <div key={i} className="stat-card"><span className="stat-card__number">{s.n}</span><span className="stat-card__label">{s.l}</span></div>
        ))}
      </div>
      <div className="dashboard__card"><h3>Quick Actions</h3><div className="quick-actions">
        {qa.map((q, i) => (
          <a key={i} className="quick-action" href="#"><span className="quick-action__icon">{q.icon}</span><div className="quick-action__text"><strong>{q.label}</strong><span>{q.desc}</span></div></a>
        ))}
      </div></div>
      <div className="dashboard__card"><h3>Getting Started</h3>
        <ol style={{ fontSize: '.8rem', color: '#475569', paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Fill in your personal information under <strong>General</strong></li>
          <li style={{ marginBottom: 6 }}>Write your <strong>Hero</strong> section and <strong>About</strong> page</li>
          <li style={{ marginBottom: 6 }}>Add your <strong>Courses</strong>, <strong>Philosophy</strong>, and <strong>Achievements</strong></li>
          <li style={{ marginBottom: 6 }}>Upload images to the <strong>Media Library</strong></li>
          <li style={{ marginBottom: 6 }}>Pick a <strong>Theme</strong> and fine-tune styles</li>
          <li style={{ marginBottom: 6 }}>Click <strong>Build Site</strong> to generate your portfolio</li>
        </ol>
      </div>
    </div>
  );
}
