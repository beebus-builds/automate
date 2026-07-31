'use client';

import React, { useState, useEffect } from 'react';
import { CMSProvider, useCMS } from './CMSContext';
import { Dashboard } from './components/Dashboard';
import { General, Hero, About, Contact } from './components/GeneralHeroAbout';
import { Courses, Philosophy, Achievements, SEO } from './components/CoursesPhilAchSEO';
import { Media } from './components/MediaTab';
import { ThemeTab } from './components/ThemeTab';
import { Preview } from './components/Preview';
import { Logo } from '@/components/Logo';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'general', label: 'General', icon: '⚙' },
  { id: 'hero', label: 'Hero', icon: '✨' },
  { id: 'about', label: 'About', icon: '👤' },
  { id: 'courses', label: 'Courses', icon: '📖' },
  { id: 'philosophy', label: 'Philosophy', icon: '✍' },
  { id: 'achievements', label: 'Achievements', icon: '⭐' },
  { id: 'contact', label: 'Contact', icon: '📧' },
  { id: 'seo', label: 'SEO & Settings', icon: '🔍' },
  { id: 'media', label: 'Media', icon: '🖼' },
  { id: 'theme', label: 'Themes & Style', icon: '🎨' },
];

function CMSInner() {
  const { data, loading, changed, toast, undo, triggerBuild, togglePreview, save } = useCMS();
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'general': return <General />;
      case 'hero': return <Hero />;
      case 'about': return <About />;
      case 'courses': return <Courses />;
      case 'philosophy': return <Philosophy />;
      case 'achievements': return <Achievements />;
      case 'contact': return <Contact />;
      case 'seo': return <SEO />;
      case 'media': return <Media />;
      case 'theme': return <ThemeTab />;
      default: return <Dashboard />;
    }
  };

  const currentLabel = tabs.find(t => t.id === activeTab)?.label || 'Dashboard';

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;
  }

  return (
    <div className="cms">
      <div className="cms-sidebar">
        <div className="cms-sidebar-brand flex items-center gap-2.5">
          <Logo size={32} />
          <div>
            <h1 className="m-0 text-base font-bold text-white">TeacherFolio</h1>
            <p className="m-0 text-[0.65rem] text-slate-500">CMS Dashboard</p>
          </div>
        </div>
        <div className="cms-sidebar-nav">
          {tabs.map(t => (
            <div key={t.id} className={'cms-nav-item' + (activeTab === t.id ? ' active' : '')} onClick={() => setActiveTab(t.id)}>
              <span className="cms-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-white/[0.08] text-[0.65rem] text-slate-600">v1.0 • Next.js</div>
      </div>

      <div className="cms-main">
        <div className="cms-topbar">
          <span className="cms-topbar-title">{currentLabel}</span>
          <div className="cms-topbar-actions">
            <span className={'cms-status ' + (changed ? 'cms-status--unsaved' : 'cms-status--saved')}>
              {changed ? 'Unsaved' : 'Saved'}
            </span>
            <button className="cms-btn cms-btn--secondary" onClick={undo}>↩ Undo</button>
            <button className="cms-btn cms-btn--secondary" onClick={togglePreview}>👁 Preview</button>
            <button className="cms-btn cms-btn--primary" onClick={triggerBuild}>🚀 Build Site</button>
            <a href="/site-preview" target="_blank" className="cms-btn cms-btn--secondary no-underline">🌐 View Site</a>
          </div>
        </div>

        <div className="cms-body">
          <div className="cms-content">
            {renderTab()}
          </div>
          <Preview />
        </div>
      </div>

      <div className={'toast' + (toast ? ' toast--visible' : '')}>{toast}</div>
    </div>
  );
}

export default function CMSPage() {
  return (
    <CMSProvider>
      <CMSInner />
    </CMSProvider>
  );
}
