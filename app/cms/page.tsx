'use client';

import React, { useState, useEffect } from 'react';
import { CMSProvider, useCMS } from './CMSContext';
import { Dashboard } from './components/Dashboard';
import { General, Hero, About, Contact } from './components/GeneralHeroAbout';
import { Courses, Philosophy, Achievements, SEO } from './components/CoursesPhilAchSEO';
import { Media } from './components/MediaTab';
import { ThemeTab } from './components/ThemeTab';
import { Preview } from './components/Preview';

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
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Loading...</div>;
  }

  return (
    <div className="cms">
      <div className="cms-sidebar">
        <div className="cms-sidebar-brand">
          <h1>Teacher CMS</h1>
          <p>Portfolio Builder</p>
        </div>
        <div className="cms-sidebar-nav">
          {tabs.map(t => (
            <div key={t.id} className={'cms-nav-item' + (activeTab === t.id ? ' active' : '')} onClick={() => setActiveTab(t.id)}>
              <span className="cms-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize: '.65rem', color: '#475569' }}>v1.0 • Next.js</div>
        </div>
      </div>

      <div className="cms-main">
        <div className="cms-topbar">
          <span className="cms-topbar-title">{currentLabel}</span>
          <div className="cms-topbar-actions">
            <span className={'cms-status ' + (changed ? 'cms-status--unsaved' : 'cms-status--saved')}>
              {changed ? 'Unsaved' : 'Saved to DB'}
            </span>
            <button className="cms-btn cms-btn--secondary" onClick={undo}>↩ Undo</button>
            <button className="cms-btn cms-btn--secondary" onClick={save}>💾 Save Now</button>
            <button className="cms-btn cms-btn--secondary" onClick={togglePreview}>👁 Preview</button>
            <button className="cms-btn cms-btn--primary" onClick={triggerBuild}>🚀 Build Site</button>
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
