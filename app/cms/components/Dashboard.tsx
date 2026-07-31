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

export function Dashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
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
          <div key={i} className="stat-card bg-surface-50 border border-white/10">
            <span className="stat-card__number">{s.n}</span>
            <span className="stat-card__label">{s.l}</span>
          </div>
        ))}
      </div>
      <div className="dashboard__card bg-surface-50 border border-white/10">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          {qa.map((q, i) => (
            <button key={i} onClick={() => onNavigate?.(q.tab)} className="quick-action bg-surface-800/50 border border-white/5 text-left w-full">
              <span className="quick-action__icon">{q.icon}</span>
              <div className="quick-action__text"><strong>{q.label}</strong><span>{q.desc}</span></div>
            </button>
          ))}
        </div>
      </div>
      <div className="dashboard__card bg-surface-50 border border-white/10">
        <h3>Getting Started</h3>
        <ol className="text-sm text-slate-400 pl-5 m-0 space-y-1.5">
          <li>Fill in your personal information under <strong className="text-slate-200">General</strong></li>
          <li>Write your <strong className="text-slate-200">Hero</strong> section and <strong className="text-slate-200">About</strong> page</li>
          <li>Add your <strong className="text-slate-200">Courses</strong>, <strong className="text-slate-200">Philosophy</strong>, and <strong className="text-slate-200">Achievements</strong></li>
          <li>Upload images to the <strong className="text-slate-200">Media Library</strong></li>
          <li>Pick a <strong className="text-slate-200">Theme</strong> and fine-tune styles</li>
          <li>Click <strong className="text-slate-200">Build Site</strong> to generate your portfolio</li>
        </ol>
      </div>
    </div>
  );
}
