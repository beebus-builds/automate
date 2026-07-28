'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';

const PH = (seed: string, w: number, h: number) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const AV = (id: number) => `https://i.pravatar.cc/120?u=teacher${id}`;

const css = `
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes floatSlow{0%,100%{transform:translate(0,0)}33%{transform:translate(25px,-25px)}66%{transform:translate(-15px,15px)}}
@keyframes accordionOpen{from{max-height:0;opacity:0}to{max-height:300px;opacity:1}}
@keyframes megaOverlay{from{opacity:0}to{opacity:1}}
@keyframes megaPanel{from{opacity:0;transform:translateY(-6px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes megaItem{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:200% 0}to{background-position:-200% 0}}
@keyframes slideInRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes navShrink{from{height:80px}to{height:64px}}
.reveal,.r-s{opacity:0;transition:all 0.7s cubic-bezier(0.4,0,0.2,1)}
.reveal{transform:translateY(30px)}.r-s{transform:scale(0.92)}
.reveal.show,.r-s.show{opacity:1;transform:translateY(0) scale(1)}
.nav-link{position:relative;transition:color 0.2s}
.nav-link::after{content:'';position:absolute;bottom:-2px;left:50%;width:0;height:2px;background:linear-gradient(90deg,#6366f1,#a855f7);border-radius:2px;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);transform:translateX(-50%)}
.nav-link:hover::after{width:70%}
.nav-link:hover{color:#e2e8f0!important}
.nav-pill{transition:all 0.25s cubic-bezier(0.4,0,0.2,1);cursor:pointer}
.nav-pill:hover{background:rgba(99,102,241,0.12)!important;border-color:rgba(99,102,241,0.25)!important;transform:translateY(-1px)}
.mega-item{transition:all 0.25s cubic-bezier(0.4,0,0.2,1);border-radius:14px;padding:14px;cursor:pointer;text-decoration:none;display:block;color:inherit}
.mega-item:hover{background:rgba(99,102,241,0.08);transform:translateY(-2px)}
.mega-item:hover .mega-icon{transform:scale(1.1);background:rgba(99,102,241,0.2)!important}
.mega-item:hover .mega-arrow{opacity:1;transform:translateX(4px)}
.mega-icon{transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
.mega-arrow{opacity:0;transform:translateX(0);transition:all 0.25s cubic-bezier(0.4,0,0.2,1)}
.mega-search::placeholder{color:#64748b}
.mega-search:focus{outline:none;border-color:rgba(99,102,241,0.5);box-shadow:0 0 0 3px rgba(99,102,241,0.1)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}
@media(max-width:1024px){nav{display:none!important}.mobile-hamburger{display:flex!important}}
@media(min-width:1025px){.mobile-hamburger{display:none!important}}
`;

const themeList = [
  { id: 'modern', name: 'Modern Indigo', primary: '#4f46e5', accent: '#059669', font: 'Sans-Serif', desc: 'Clean indigo & emerald scheme' },
  { id: 'academic', name: 'Academic Navy', primary: '#1e3a8a', accent: '#1e40af', font: 'Serif', desc: 'Classic deep navy for universities' },
  { id: 'warm', name: 'Warm Amber', primary: '#d97706', accent: '#b45309', font: 'Serif', desc: 'Cozy amber & deep gold tones' },
  { id: 'creative', name: 'Creative Magenta', primary: '#db2777', accent: '#c026d3', font: 'Sans-Serif', desc: 'Bold pink & magenta expressive style' },
  { id: 'cyber', name: 'Cyber STEM', primary: '#0284c7', accent: '#0891b2', font: 'Monospace', desc: 'Deep cyan & tech slate for STEM' },
  { id: 'emerald', name: 'Emerald Bio', primary: '#047857', accent: '#059669', font: 'Sans-Serif', desc: 'Forest green for science & biology' },
  { id: 'sunset', name: 'Sunset Violet', primary: '#ea580c', accent: '#7c3aed', font: 'Sans-Serif', desc: 'Vibrant coral & violet for early ed' },
  { id: 'minimal', name: 'Minimal Slate', primary: '#0f172a', accent: '#334155', font: 'Sans-Serif', desc: 'Sleek charcoal & dark slate clarity' },
];

const menuData = {
  services: {
    key: 'services' as const,
    title: 'Our Services',
    subtitle: 'Everything you need to build, manage & deploy',
    featured: {
      headline: 'AI-Powered Portfolio Engine',
      desc: 'Generate a complete educator website through a natural chat conversation. No coding. No templates. Just answers.',
      cta: 'Start Building Free →',
      ctaHref: '/build',
      gradient: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(168,85,247,0.15),rgba(236,72,153,0.1))',
    },
    center: [
      { icon: '🤖', title: 'AI Chat Wizard', desc: 'Build in 5 minutes through conversation', href: '/build', badge: 'Popular' },
      { icon: '🎛️', title: 'CMS Dashboard', desc: '11-tab editor for content & SEO', href: '/cms', badge: '' },
      { icon: '👁️', title: 'Live Preview', desc: 'Real-time portfolio preview', href: '/site-preview', badge: 'New' },
      { icon: '📦', title: 'ZIP Export', desc: 'Standalone HTML/CSS/JS bundle', href: '/api/download', badge: '' },
      { icon: '🚀', title: 'Vercel Deploy', desc: 'One-click live publishing', href: '/build', badge: '' },
      { icon: '📈', title: 'SEO Suite', desc: 'Meta tags, OG images, sitemaps', href: '/cms', badge: 'Pro' },
    ],
    right: {
      title: 'Why Educators Choose Us',
      items: [
        { icon: '⚡', text: 'Zero code required' },
        { icon: '🎨', text: '8 designer themes' },
        { icon: '🔒', text: 'Private & secure' },
        { icon: '🌐', text: 'Live in under 5 min' },
      ],
      cta: 'Explore All Features',
      ctaHref: '#features',
    },
    bottom: [
      { label: 'Popular: Chat Builder', href: '/build' },
      { label: 'New: Theme Editor', href: '/cms' },
      { label: 'Guide: Getting Started', href: '#how-it-works' },
      { label: 'Support', href: '#' },
    ],
  },
  solutions: {
    key: 'solutions' as const,
    title: 'Solutions',
    subtitle: 'Tailored for every education role',
    featured: {
      headline: 'Built for Every Educator',
      desc: 'From K-12 to university faculty, our platform adapts to your subject, grade level, and career goals.',
      cta: 'Find Your Solution →',
      ctaHref: '/build',
      gradient: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.15),rgba(6,182,212,0.1))',
    },
    center: [
      { icon: '🏫', title: 'K-12 Teachers', desc: 'Classroom portfolios with parent portals', href: '/build', badge: '' },
      { icon: '🎓', title: 'University Faculty', desc: 'Research & publication showcases', href: '/build', badge: '' },
      { icon: '🔬', title: 'STEM Specialists', desc: 'Lab reports & project portfolios', href: '/build', badge: 'Popular' },
      { icon: '📝', title: 'Language Arts', desc: 'Writing samples & reading lists', href: '/build', badge: '' },
      { icon: '🎨', title: 'Arts & Music', desc: 'Gallery & performance portfolios', href: '/build', badge: '' },
      { icon: '💙', title: 'Special Education', desc: 'IEP tracking & parent communication', href: '/build', badge: 'New' },
    ],
    right: {
      title: 'Success Story',
      items: [
        { icon: '⭐', text: '"My site was live in 4 minutes."' },
        { icon: '📊', text: '500+ educators onboarded' },
        { icon: '🏆', text: 'Average rating: 4.9/5' },
        { icon: '🌍', text: 'Used in 30+ countries' },
      ],
      cta: 'Read Case Studies',
      ctaHref: '#testimonials',
    },
    bottom: [
      { label: 'K-12 Teacher Guide', href: '/build' },
      { label: 'University Template', href: '/build' },
      { label: 'Subject Showcase Tips', href: '#features' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  industries: {
    key: 'industries' as const,
    title: 'Industries',
    subtitle: 'Serving all education levels & subjects',
    featured: {
      headline: 'One Platform. Every Subject.',
      desc: 'Mathematics, science, humanities, arts — our portfolio builder works beautifully for any discipline.',
      cta: 'Browse by Subject →',
      ctaHref: '/build',
      gradient: 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(217,119,6,0.15),rgba(239,68,68,0.1))',
    },
    center: [
      { icon: '📐', title: 'Mathematics', desc: 'Algebra, Calculus, Statistics', href: '/build', badge: '' },
      { icon: '🔬', title: 'Science & STEM', desc: 'Physics, Chem, Bio, Engineering', href: '/build', badge: 'Popular' },
      { icon: '📖', title: 'Language Arts', desc: 'Literature, Writing, Journalism', href: '/build', badge: '' },
      { icon: '🌍', title: 'Social Studies', desc: 'History, Geography, Civics', href: '/build', badge: '' },
      { icon: '🎭', title: 'Arts & Music', desc: 'Visual Arts, Theater, Band', href: '/build', badge: '' },
      { icon: '⚽', title: 'Physical Education', desc: 'Sports, Health, Wellness', href: '/build', badge: '' },
      { icon: '💙', title: 'Special Education', desc: 'Inclusive learning resources', href: '/build', badge: 'New' },
      { icon: '🌐', title: 'ESL / ELL', desc: 'Language acquisition tools', href: '/build', badge: '' },
    ],
    right: {
      title: 'Featured Resource',
      items: [
        { icon: '📘', text: 'Subject-specific templates' },
        { icon: '🎯', text: 'Standards-aligned layouts' },
        { icon: '🖼️', text: 'Industry imagery packs' },
        { icon: '📋', text: 'Curriculum showcase tips' },
      ],
      cta: 'View All Subjects',
      ctaHref: '#themes',
    },
    bottom: [
      { label: 'STEM Portfolio Guide', href: '/build' },
      { label: 'Humanities Templates', href: '/build' },
      { label: 'Elementary School Designs', href: '/build' },
      { label: 'Higher Ed Examples', href: '#showcase' },
    ],
  },
  resources: {
    key: 'resources' as const,
    title: 'Resources',
    subtitle: 'Learn, explore & get inspired',
    featured: {
      headline: 'Knowledge Hub for Educators',
      desc: 'Tutorials, guides, case studies, and inspiration to help you create the perfect teaching portfolio.',
      cta: 'Explore Resources →',
      ctaHref: '#how-it-works',
      gradient: 'linear-gradient(135deg,rgba(6,182,212,0.2),rgba(59,130,246,0.15),rgba(99,102,241,0.1))',
    },
    center: [
      { icon: '📖', title: 'Documentation', desc: 'Complete platform guides', href: '#how-it-works', badge: '' },
      { icon: '🎬', title: 'Video Tutorials', desc: 'Step-by-step walkthroughs', href: '#how-it-works', badge: 'New' },
      { icon: '📊', title: 'Case Studies', desc: 'Real educator success stories', href: '#testimonials', badge: '' },
      { icon: '📰', title: 'Blog & News', desc: 'Tips & platform updates', href: '/', badge: '' },
      { icon: '❓', title: 'FAQ Center', desc: 'Quick answers to questions', href: '#faq', badge: '' },
      { icon: '💬', title: 'Community', desc: 'Join educator discussions', href: '#testimonials', badge: 'Beta' },
    ],
    right: {
      title: 'Stay Updated',
      items: [
        { icon: '📬', text: 'Monthly newsletter' },
        { icon: '🆕', text: 'New feature alerts' },
        { icon: '💡', text: 'Portfolio tips & tricks' },
        { icon: '🎁', text: 'Exclusive templates' },
      ],
      cta: 'Subscribe →',
      ctaHref: '#',
    },
    bottom: [
      { label: 'Quick Start Guide', href: '#how-it-works' },
      { label: 'Video: First Portfolio', href: '#how-it-works' },
      { label: 'Templates Gallery', href: '#themes' },
      { label: 'Support Center', href: '#' },
    ],
  },
};

function MegaBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="presentation"
      style={{ position:'fixed', inset:0, zIndex:90, background:'rgba(0,0,0,0.35)', backdropFilter:'blur(6px)', animation:'megaOverlay 0.25s ease' }}
    />
  );
}

function MegaMenu({ type, onClose }: { type: keyof typeof menuData; onClose: () => void }) {
  const data = menuData[type];
  const [search, setSearch] = useState('');

  return (
    <div
      role="menu"
      aria-label={`${data.title} menu`}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      style={{
        position:'absolute', top:'calc(100% + 10px)', left:'50%', transform:'translateX(-50%)',
        width: 1080, background:'rgba(10,14,23,0.97)', backdropFilter:'blur(32px) saturate(200%)',
        border:'1px solid rgba(255,255,255,0.08)', borderRadius: 24,
        boxShadow:'0 40px 100px rgba(0,0,0,0.8), 0 0 40px rgba(99,102,241,0.08)',
        zIndex: 101, animation:'megaPanel 0.3s cubic-bezier(0.16,1,0.3,1) both',
        padding: 0, overflow: 'hidden',
      }}
    >
      {/* Search bar */}
      <div style={{ padding:'16px 24px 0' }}>
        <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:'absolute', left:14, pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Search services, solutions, resources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mega-search"
            aria-label="Search menu"
            style={{ width:'100%', padding:'10px 14px 10px 40px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, color:'#f1f5f9', fontSize:.85, fontFamily:'inherit' }}
          />
          <kbd style={{ position:'absolute', right:12, padding:'2px 8px', background:'rgba(255,255,255,0.06)', borderRadius:6, fontSize:'.65rem', color:'#64748b', border:'1px solid rgba(255,255,255,0.06)' }}>⌘K</kbd>
        </div>
      </div>

      {/* Three-panel body */}
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr 220px', gap:0, padding:'16px 24px 0' }}>
        {/* LEFT PANEL: Featured */}
        <div style={{ background: data.featured.gradient, borderRadius:16, padding:20, display:'flex', flexDirection:'column', justifyContent:'space-between', border:'1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', marginBottom:14 }}>{type === 'services' ? '⚡' : type === 'solutions' ? '🎯' : type === 'industries' ? '🏢' : '📚'}</div>
            <h3 style={{ fontSize:'1.05rem', fontWeight:800, color:'#fff', margin:'0 0 8px', lineHeight:1.3, letterSpacing:'-0.3px' }}>{data.featured.headline}</h3>
            <p style={{ fontSize:.78, color:'#94a3b8', margin:0, lineHeight:1.6 }}>{data.featured.desc}</p>
          </div>
          <Link
            href={data.featured.ctaHref}
            onClick={onClose}
            style={{ marginTop:16, padding:'10px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', borderRadius:10, fontWeight:700, fontSize:.78, textDecoration:'none', textAlign:'center', boxShadow:'0 4px 16px rgba(99,102,241,0.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
          >
            {data.featured.cta}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 19 12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>

        {/* CENTER PANEL: Grid */}
        <div style={{ paddingLeft:20, paddingRight:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:'.7rem', fontWeight:700, color:'#818cf8', textTransform:'uppercase', letterSpacing:'1px' }}>{data.title}</span>
            <span style={{ fontSize:'.65rem', color:'#64748b' }}>{data.center.length} items</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {data.center
              .filter(item => !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase()))
              .map((item, i) => (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={onClose}
                  className="mega-item"
                  style={{ animation: `megaItem 0.35s ease ${i * 0.04}s both` }}
                  aria-label={`${item.title}: ${item.desc}`}
                >
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div className="mega-icon" style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>{item.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontWeight:700, fontSize:.82, color:'#f1f5f9' }}>{item.title}</span>
                        {item.badge && (
                          <span style={{ fontSize:'.58rem', fontWeight:700, padding:'1px 7px', borderRadius:999, background: item.badge === 'Popular' ? 'rgba(52,211,153,0.15)' : item.badge === 'New' ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)', color: item.badge === 'Popular' ? '#34d399' : item.badge === 'New' ? '#818cf8' : '#fbbf24' }}>{item.badge}</span>
                        )}
                      </div>
                      <span style={{ fontSize:.72, color:'#64748b', display:'block', lineHeight:1.3, marginTop:2 }}>{item.desc}</span>
                    </div>
                    <div className="mega-arrow" style={{ marginTop:8, flexShrink:0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* RIGHT PANEL: Resources */}
        <div style={{ borderLeft:'1px solid rgba(255,255,255,0.06)', paddingLeft:16 }}>
          <span style={{ fontSize:'.7rem', fontWeight:700, color:'#a855f7', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:12 }}>{data.right.title}</span>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {data.right.items.map(item => (
              <div key={item.text} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, transition:'all 0.2s', cursor:'default' }}>
                <span style={{ fontSize:'.85rem', width:20, textAlign:'center' }}>{item.icon}</span>
                <span style={{ fontSize:.75, color:'#94a3b8', lineHeight:1.3 }}>{item.text}</span>
              </div>
            ))}
          </div>
          <Link href={data.right.ctaHref} onClick={onClose} style={{ marginTop:12, display:'block', padding:'8px 12px', background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:10, color:'#c084fc', fontSize:.72, fontWeight:700, textDecoration:'none', textAlign:'center', transition:'all 0.2s' }}>{data.right.cta}</Link>
        </div>
      </div>

      {/* BOTTOM STRIP */}
      <div style={{ marginTop:16, borderTop:'1px solid rgba(255,255,255,0.06)', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:'.65rem', color:'#475569', fontWeight:600, marginRight:8 }}>Quick Links:</span>
          {data.bottom.map((link, i) => (
            <Link key={i} href={link.href} onClick={onClose} style={{ fontSize:.72, color:'#64748b', textDecoration:'none', padding:'4px 10px', borderRadius:8, transition:'all 0.2s', whiteSpace:'nowrap' }}>{link.label}</Link>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <a href="#" style={{ fontSize:.72, color:'#475569', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Live Chat</a>
          <a href="#" style={{ fontSize:.72, color:'#475569', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>Docs</a>
        </div>
      </div>
    </div>
  );
}

function MobileDrawer({ open, onClose, user, onSignIn }: { open: boolean; onClose: () => void; user: any; onSignIn: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition:'all 0.4s ease',
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position:'fixed', top:0, right:0, bottom:0, width:'min(380px,85vw)', zIndex:201,
          background:'rgba(10,14,23,0.98)', backdropFilter:'blur(32px)',
          borderLeft:'1px solid rgba(255,255,255,0.06)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition:'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
          display:'flex', flexDirection:'column',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontWeight:800, fontSize:'1.1rem', color:'#fff' }}>Menu</span>
          <button onClick={onClose} aria-label="Close menu" style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Navigation */}
        <div style={{ flex:1, overflow:'auto', padding:'16px 12px' }}>
          <Link href="/" onClick={onClose} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, color:'#e2e8f0', fontWeight:600, textDecoration:'none', fontSize:.9, background:'rgba(99,102,241,0.08)', marginBottom:4 }}>Home</Link>
          {Object.entries(menuData).map(([key, data]) => (
            <div key={key}>
              <button
                onClick={() => setExpanded(expanded === key ? null : key)}
                aria-expanded={expanded === key}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:'none', border:'none', color:'#94a3b8', fontWeight:500, fontSize:.9, cursor:'pointer', fontFamily:'inherit', borderRadius:12, transition:'all 0.15s' }}
              >
                {data.title}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${expanded === key ? 180 : 0}deg)`, transition:'transform 0.3s' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {expanded === key && (
                <div style={{ paddingLeft:8, animation:'accordionOpen 0.3s ease' }}>
                  {data.center.map((item: any) => (
                    <Link key={item.title} href={item.href} onClick={onClose} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderRadius:10, color:'#94a3b8', textDecoration:'none', fontSize:.82, transition:'all 0.15s' }}>
                      <span style={{ fontSize:'1rem' }}>{item.icon}</span>
                      <span style={{ fontWeight:500 }}>{item.title}</span>
                      {item.badge && <span style={{ fontSize:'.6rem', fontWeight:700, padding:'1px 6px', borderRadius:999, background:'rgba(99,102,241,0.15)', color:'#818cf8', marginLeft:'auto' }}>{item.badge}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div style={{ marginTop:12, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12 }}>
            {['Pricing','About','Contact'].map(item => (
              <Link key={item} href="/" onClick={onClose} style={{ display:'block', padding:'14px 16px', borderRadius:12, color:'#94a3b8', fontWeight:500, textDecoration:'none', fontSize:.9 }}>{item}</Link>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          {user ? (
            <div style={{ display:'flex', gap:10 }}>
              <span style={{ flex:1, padding:'12px 16px', background:'rgba(99,102,241,0.1)', borderRadius:10, color:'#a5b4fc', fontWeight:600, fontSize:.85, textAlign:'center' }}>{user.name}</span>
              <button onClick={async()=>{ await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})}); onClose(); }} style={{ padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'none', borderRadius:10, color:'#fca5a5', fontWeight:600, fontSize:.85, cursor:'pointer' }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => { onSignIn(); onClose(); }} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:.9, cursor:'pointer' }}>Sign In</button>
          )}
        </div>
      </div>
    </>
  );
}

const features = [
  { letter: 'B', color: '#4f46e5', title: 'Guided Chat Interview', desc: 'Answer 9 quick questions in a natural dialogue. Our AI formats your career milestones into an elite educator layout.' },
  { letter: 'P', color: '#7c3aed', title: '8 Designer Themes', desc: 'From Academic Navy to Cyber STEM — switch themes in one click with curated color palettes and font pairings.' },
  { letter: 'Z', color: '#059669', title: 'Portable ZIP Export', desc: 'Download a clean, production-ready bundle of HTML, CSS, and JS. Host it anywhere — no platform lock-in.' },
  { letter: 'D', color: '#0284c7', title: 'Personalized Live Deploy', desc: 'Push directly to Vercel from the chat wizard. Each teacher gets their own project and unique live URL.' },
  { letter: 'C', color: '#d97706', title: 'Course Showcase', desc: 'Highlight your syllabus, grade levels, and learning resources so students and parents stay informed.' },
  { letter: 'G', color: '#db2777', title: '11-Tab Advanced CMS', desc: 'Fine-tune every heading, media asset, SEO tag, and theme color with our comprehensive built-in dashboard.' },
  { letter: 'S', color: '#0891b2', title: 'SEO Optimized', desc: 'Auto-generated meta tags, OG images, and semantic HTML. Your portfolio ranks beautifully on Google.' },
  { letter: 'M', color: '#65a30d', title: 'Mobile Responsive', desc: 'Every theme and layout is fully responsive. Your portfolio looks flawless on phones, tablets, and desktops.' },
];

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'services'|'solutions'|'industries'|'resources'|null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    fetch('/api/auth').then(r=>r.json()).then(d=>{ if(d.user) setUser(d.user); }).catch(()=>{});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    obsRef.current = new IntersectionObserver((entries) => {
      entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('show'); obsRef.current?.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal,.r-s').forEach(el => obsRef.current?.observe(el));
    return () => obsRef.current?.disconnect();
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#070b14', color:'#f1f5f9', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', overflowX:'hidden' }}>
      <style>{css}</style>

      {/* Ambient glow */}
      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)', top:'5%', left:'-10%', filter:'blur(90px)', animation:'floatSlow 14s ease-in-out infinite' }} />
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,0.07) 0%,transparent 70%)', top:'30%', right:'-5%', filter:'blur(90px)', animation:'floatSlow 18s ease-in-out infinite 3s' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(244,114,182,0.05) 0%,transparent 70%)', bottom:'20%', left:'20%', filter:'blur(80px)', animation:'floatSlow 22s ease-in-out infinite 6s' }} />
      </div>

      {/* Header - Premium Sticky Nav */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        background: scrollY > 60 ? 'rgba(7,11,20,0.94)' : 'rgba(7,11,20,0.98)',
        backdropFilter: scrollY > 60 ? 'blur(28px) saturate(200%)' : 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition:'all 0.4s cubic-bezier(0.4,0,0.2,1)',
        padding:'0 48px',
        height: scrollY > 60 ? 64 : 80,
      }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:'100%' }}>
          {/* Logo - Prominent Left */}
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:14, textDecoration:'none', flexShrink:0 }}>
            <div style={{
              width: scrollY > 60 ? 40 : 48, height: scrollY > 60 ? 40 : 48, borderRadius:14,
              background:'linear-gradient(135deg,#6366f1,#a855f7)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 8px 32px rgba(99,102,241,0.4)',
              transition:'all 0.4s cubic-bezier(0.4,0,0.2,1)',
            }}>
              <svg width={scrollY > 60 ? 24 : 28} height={scrollY > 60 ? 24 : 28} viewBox="0 0 36 36" fill="none">
                <path d="M10 14L18 10L26 14L18 18L10 14Z" fill="white" />
                <path d="M12 17.5V22C12 22 15 24 18 24C21 24 24 22 24 22V17.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M23 15.5V20.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1.15 }}>
              <span style={{ fontWeight:900, fontSize: scrollY > 60 ? '1.15rem' : '1.3rem', letterSpacing:'-0.5px', color:'#fff', transition:'font-size 0.4s' }}>TeacherFolio</span>
              <span style={{ fontSize:'.6rem', color:'#818cf8', fontWeight:600, letterSpacing:'0.8px' }}>EDUCATOR PORTFOLIOS</span>
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <nav style={{ display:'flex', gap:1, alignItems:'center' }} onMouseLeave={() => setActiveMenu(null)}>
              <Link href="/" className="nav-link" style={{ padding:'8px 14px', color:'#e2e8f0', fontWeight:600, textDecoration:'none', fontSize:.85, borderRadius:8 }}>Home</Link>
              {(['services','solutions','industries','resources'] as const).map(key => {
                const labels = { services:'Services', solutions:'Solutions', industries:'Industries', resources:'Resources' };
                return (
                  <div key={key} style={{ position:'static' }} onMouseEnter={() => setActiveMenu(key)}>
                    <button className="nav-link" style={{ padding:'8px 14px', color: activeMenu===key ? '#818cf8' : '#94a3b8', fontWeight:500, background:'none', border:'none', fontSize:.85, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                      {labels[key]}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform:`rotate(${activeMenu===key?180:0}deg)`, transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)' }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {activeMenu===key && <MegaMenu type={key} onClose={() => setActiveMenu(null)} />}
                  </div>
                );
              })}
              <Link href="/" className="nav-link" style={{ padding:'8px 14px', color:'#94a3b8', fontWeight:500, textDecoration:'none', fontSize:.85, borderRadius:8 }}>Pricing</Link>
              <Link href="/" className="nav-link" style={{ padding:'8px 14px', color:'#94a3b8', fontWeight:500, textDecoration:'none', fontSize:.85, borderRadius:8 }}>About</Link>
              <Link href="/" className="nav-link" style={{ padding:'8px 14px', color:'#94a3b8', fontWeight:500, textDecoration:'none', fontSize:.85, borderRadius:8 }}>Contact</Link>
            </nav>

            <div style={{ width:1, height:28, background:'rgba(255,255,255,0.08)', margin:'0 12px' }} />

            {/* Account + CTA */}
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {user ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:.82, color:'#a5b4fc', fontWeight:600, background:'rgba(99,102,241,0.12)', padding:'6px 14px', borderRadius:8 }}>{user.name}</span>
                  <button onClick={async()=>{ await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})}); setUser(null); }} style={{ padding:'6px 12px', background:'rgba(239,68,68,0.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, fontSize:.78, fontWeight:600, cursor:'pointer' }}>Logout</button>
                </div>
              ) : (
                <button onClick={()=>setIsAuthOpen(true)} style={{ padding:'7px 16px', background:'rgba(255,255,255,0.05)', color:'#e2e8f0', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, fontSize:.82, fontWeight:600, cursor:'pointer' }}>Sign In</button>
              )}
              <Link href="/build" style={{
                padding: scrollY > 60 ? '8px 18px' : '10px 24px',
                background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', borderRadius:10,
                fontWeight:700, textDecoration:'none', fontSize:.85,
                boxShadow:'0 6px 24px rgba(99,102,241,0.4)',
                display:'flex', alignItems:'center', gap:6,
                transition:'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              }}>
                Build Yours
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 19 12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              style={{ display:'none', width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', alignItems:'center', justifyContent:'center', color:'#94a3b8', marginLeft:8 }}
              className="mobile-hamburger"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mega Menu Backdrop */}
      {activeMenu && <MegaBackdrop onClose={() => setActiveMenu(null)} />}

      {/* Mobile Drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} user={user} onSignIn={() => setIsAuthOpen(true)} />

      {/* ===== HERO ===== */}
      <section style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', alignItems:'center', padding:'110px 24px 60px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 16px 5px 6px', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:999, fontSize:.8, fontWeight:600, color:'#a5b4fc', marginBottom:28, animation:'fadeIn 0.8s ease' }}>
              <span style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#6366f1,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:.6 }}>✨</span>
              AI-Powered Educator Portfolios
            </div>
            <h1 style={{ fontSize:'clamp(2.6rem,7vw,4.2rem)', fontWeight:900, color:'#fff', margin:'0 0 20px', lineHeight:1.08, letterSpacing:'-2px', animation:'slideUp 0.8s ease' }}>
              Your Professional<br />
              <span style={{ background:'linear-gradient(135deg,#818cf8 0%,#c084fc 45%,#f472b6 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Teacher Website</span>
              {' '}in <span style={{ background:'linear-gradient(135deg,#34d399,#10b981)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Minutes</span>
            </h1>
            <p style={{ fontSize:'1.15rem', color:'#94a3b8', maxWidth:540, lineHeight:1.75, marginBottom:36, animation:'slideUp 0.8s ease 0.15s both' }}>
              Chat with our friendly AI assistant, pick from 8 stunning themes, and get a blazing-fast,
              standalone portfolio ready to download or deploy live — no code needed.
            </p>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', animation:'slideUp 0.8s ease 0.3s both' }}>
              <Link href="/build" style={{ padding:'16px 36px', background:'linear-gradient(135deg,#6366f1,#7c3aed)', color:'#fff', borderRadius:14, fontWeight:800, textDecoration:'none', fontSize:'1.05rem', boxShadow:'0 10px 40px rgba(99,102,241,0.4)', display:'flex', alignItems:'center', gap:10 }}>
                <span>🚀 Start Building Now</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 19 12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <Link href="/cms" style={{ padding:'16px 32px', color:'#e2e8f0', borderRadius:14, fontWeight:700, textDecoration:'none', fontSize:'1.05rem', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.03)' }}>Explore CMS →</Link>
            </div>
            <div style={{ display:'flex', gap:24, marginTop:48, animation:'fadeIn 1s ease 0.6s both' }}>
              {['🎯 No Code Needed','⚡ Instant Deploy','🛡️ Private & Secure'].map(s=><span key={s} style={{ fontSize:.82, color:'#64748b', fontWeight:500 }}>{s}</span>)}
            </div>
          </div>
          <div style={{ position:'relative', animation:'scaleIn 1s ease 0.2s both' }}>
            <div style={{ borderRadius:24, overflow:'hidden', boxShadow:'0 30px 80px rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <img
                ref={imgRef}
                src={PH('teacher-hero', 600, 700)}
                alt="Teacher in classroom"
                style={{ width:'100%', height:'auto', display:'block', filter: heroLoaded ? 'none' : 'blur(20px)', transition:'filter 0.5s ease', transitionDelay:'0.3s' }}
                onLoad={() => setHeroLoaded(true)}
              />
            </div>
            <div style={{ position:'absolute', bottom:-16, left:-16, background:'rgba(99,102,241,0.12)', backdropFilter:'blur(16px)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:14, padding:'12px 20px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#34d399,#10b981)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:.9 }}>✓</div>
              <div><div style={{ fontSize:.75, color:'#94a3b8' }}>Portfolio Ready In</div><div style={{ fontSize:'.95rem', fontWeight:800, color:'#fff' }}>Under 5 Minutes</div></div>
            </div>
          </div>
        </div>
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:0.3, animation:'fadeIn 1s ease 1.2s both', cursor:'pointer' }} onClick={()=>window.scrollTo({top:window.innerHeight,behavior:'smooth'})}>
          <span style={{ fontSize:'.65rem', fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'2px' }}>Explore</span>
          <div style={{ width:1, height:28, background:'linear-gradient(to bottom,#6366f1,transparent)' }} />
        </div>
      </section>

      {/* ===== TRUSTED BY ===== */}
      <section style={{ zIndex:1, padding:'48px 24px', borderTop:'1px solid rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        <div className="reveal" style={{ maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:.8, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'2px', marginBottom:24 }}>Trusted by educators at</p>
          <div style={{ display:'flex', justifyContent:'center', gap:40, flexWrap:'wrap', alignItems:'center', opacity:0.45 }}>
            {['🏫','📚','🎓','🌍','⚗️','📐'].map((e,i)=><span key={i} style={{ fontSize:'1.6rem', filter:'grayscale(1)', opacity:0.6 }}>{e}</span>)}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section style={{ zIndex:1, padding:'64px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:32, textAlign:'center' }}>
          {[
            { val:'100%', label:'Standalone & Portable' },
            { val:'8', label:'Curated Themes' },
            { val:'< 5 min', label:'Setup via Chat' },
            { val:'Instant', label:'Vercel Deploy' },
          ].map((s,i)=>(
            <div key={i} className="reveal" style={{ transitionDelay:`${i*0.1}s` }}>
              <div style={{ fontSize:'2.5rem', fontWeight:900, lineHeight:1.1, marginBottom:6, background:'linear-gradient(135deg,#fff 0%,#94a3b8 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{s.val}</div>
              <div style={{ fontSize:.85, color:'#64748b', fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== LIVE PREVIEW ===== */}
      <section style={{ zIndex:1, maxWidth:1200, margin:'0 auto 100px', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:56 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>Live Preview</span>
          <h2 style={{ fontSize:'2.6rem', fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>See It <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>In Action</span></h2>
        </div>
        <div className="r-s" style={{ background:'linear-gradient(135deg,rgba(30,41,59,0.85),rgba(15,23,42,0.92))', backdropFilter:'blur(24px)', borderRadius:20, padding:'12px 12px 0', boxShadow:'0 40px 120px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', gap:8, padding:'6px 12px 16px', alignItems:'center' }}>
            {['#ef4444','#f59e0b','#10b981'].map(c=><span key={c} style={{ width:11, height:11, borderRadius:'50%', background:c, display:'inline-block' }} />)}
            <span style={{ marginLeft:'auto', fontSize:'.72rem', color:'#64748b', background:'rgba(15,23,42,0.9)', padding:'4px 18px', borderRadius:8, border:'1px solid rgba(255,255,255,0.06)' }}>sarah-johnson.vercel.app</span>
          </div>
          <div style={{ background:'linear-gradient(145deg,#0f172a,#1e293b)', borderRadius:'16px 16px 0 0', padding:'40px 36px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:20, flexWrap:'wrap' }}>
              <img src={AV(1)} alt="Sarah Johnson" style={{ width:56, height:56, borderRadius:'50%', border:'2px solid rgba(99,102,241,0.3)', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:'.75rem', fontWeight:700, color:'#818cf8', textTransform:'uppercase', letterSpacing:'1.5px' }}>Mathematics Department Chair</div>
                <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#fff', margin:'2px 0 0', letterSpacing:'-0.5px' }}>Sarah Johnson, Ph.D.</div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginLeft:'auto' }}>
                {['Algebra II Honors','AP Calculus BC','Linear Algebra','Math Club Advisor'].map((s,i)=>(
                  <span key={i} style={{ padding:'5px 12px', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', color:'#a5b4fc', borderRadius:8, fontSize:.78, fontWeight:600, opacity:0, animation:`fadeIn 0.5s ease ${0.4+i*0.1}s both` }}>{s}</span>
                ))}
              </div>
            </div>
            <p style={{ fontSize:.95, color:'#94a3b8', lineHeight:1.7, maxWidth:600, margin:'0 0 20px' }}>
              Inspiring the next generation of problem solvers through inquiry-based learning, advanced calculus, and collaborative mathematical modeling.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {['📊 15+ Years Experience','🏆 Teacher of the Year 2024','👩‍🏫 500+ Students Mentored'].map((s,i)=>(
                <span key={i} style={{ padding:'5px 14px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)', color:'#a5b4fc', borderRadius:8, fontSize:.8, fontWeight:600 }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" style={{ zIndex:1, maxWidth:1200, margin:'0 auto', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:60 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>Features</span>
          <h2 style={{ fontSize:'2.6rem', fontWeight:900, color:'#fff', margin:'0 0 12px', letterSpacing:'-1px' }}>Everything You <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Need</span></h2>
          <p style={{ fontSize:'1rem', color:'#64748b', maxWidth:520, margin:'0 auto' }}>A complete toolkit to build, customize, and publish your professional teaching portfolio.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
          {features.map((f,i)=>(
            <div key={i} className="reveal" style={{ transitionDelay:`${i*0.06}s`, background:'rgba(30,41,59,0.25)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:20, padding:'28px 28px 32px', transition:'all 0.3s ease', cursor:'default' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${f.color}22`, border:`1px solid ${f.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', fontWeight:800, color:f.color, marginBottom:18 }}>{f.letter}</div>
              <h3 style={{ fontSize:'1.05rem', fontWeight:700, color:'#fff', margin:'0 0 8px', letterSpacing:'-0.2px' }}>{f.title}</h3>
              <p style={{ fontSize:.88, color:'#94a3b8', margin:0, lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" style={{ zIndex:1, maxWidth:1100, margin:'140px auto 0', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:64 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>Process</span>
          <h2 style={{ fontSize:'2.6rem', fontWeight:900, color:'#fff', margin:'0 0 12px', letterSpacing:'-1px' }}>Three <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Simple</span> Steps</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:32 }}>
          {[
            { title:'Chat & Share', desc:'Tell us your name, subject, bio, and courses through our intelligent chat wizard. Your data is saved instantly.', img: PH('step-chat', 320, 200) },
            { title:'Choose & Preview', desc:'Select from 8 designer themes, preview live, and fine-tune every detail in the advanced CMS dashboard.', img: PH('step-theme', 320, 200) },
            { title:'Launch Live', desc:'Download your standalone ZIP or deploy to Vercel with one click. Your portfolio goes live in seconds.', img: PH('step-deploy', 320, 200) },
          ].map((s,i)=>(
            <div key={i} className="r-s" style={{ transitionDelay:`${i*0.15}s`, background:'rgba(15,23,42,0.5)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:24, overflow:'hidden' }}>
              <img src={s.img} alt={s.title} style={{ width:'100%', height:160, objectFit:'cover', display:'block', borderBottom:'1px solid rgba(255,255,255,0.05)' }} />
              <div style={{ padding:'24px 28px 28px' }}>
                <div style={{ fontSize:'.75rem', fontWeight:700, color:'#818cf8', marginBottom:8 }}>STEP 0{i+1}</div>
                <h3 style={{ fontSize:'1.2rem', fontWeight:800, color:'#fff', margin:'0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize:.9, color:'#94a3b8', margin:0, lineHeight:1.7 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BEFORE VS AFTER ===== */}
      <section style={{ zIndex:1, maxWidth:1100, margin:'140px auto 0', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:56 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>Comparison</span>
          <h2 style={{ fontSize:'2.6rem', fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>Before & <span style={{ background:'linear-gradient(135deg,#34d399,#10b981)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>After</span></h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {[
            { side:'Without TeacherFolio', icon:'✗', color:'#dc2626', bg:'rgba(220,38,38,0.06)', items:['No online presence','Hard to share credentials','Lost in a sea of applicants','No parent communication channel'] },
            { side:'With TeacherFolio', icon:'✓', color:'#10b981', bg:'rgba(16,185,129,0.06)', items:['Professional portfolio live in 5 min','Shareable URL for applications','Stand out with a custom site','Built-in contact & course showcase'] },
          ].map((col,i)=>(
            <div key={i} className={i?'r-s':'reveal'} style={{ transitionDelay:`${i*0.15}s`, background:col.bg, border:`1px solid ${col.color}22`, borderRadius:20, padding:'32px 28px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <span style={{ width:28, height:28, borderRadius:8, background:col.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.75rem', fontWeight:800 }}>{col.icon}</span>
                <h3 style={{ fontSize:'1.15rem', fontWeight:800, color:'#fff', margin:0 }}>{col.side}</h3>
              </div>
              <ul style={{ margin:0, padding:0, listStyle:'none' }}>
                {col.items.map((item,j)=>(
                  <li key={j} style={{ padding:'10px 0', borderBottom:j<col.items.length-1?'1px solid rgba(255,255,255,0.04)':'none', color:'#94a3b8', fontSize:.92, display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ color:col.color, fontWeight:700 }}>→</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SHOWCASE ===== */}
      <section style={{ zIndex:1, maxWidth:1100, margin:'140px auto 0', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:56 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>Showcase</span>
          <h2 style={{ fontSize:'2.6rem', fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>Real <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Portfolios</span></h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
          {[
            { id:2, n:'David Rivera', r:'Physics Teacher | STEM Coordinator', c:'AP Physics C, Engineering Design, Robotics Club' },
            { id:3, n:'Emily Watanabe', r:'English & Creative Writing Instructor', c:'American Literature, Poetry Workshop, Journalism' },
            { id:4, n:'Carlos Torres', r:'Elementary Education Specialist', c:'K-5 General Studies, ESL Support, Music' },
          ].map((p,j)=>(
            <div key={j} className="reveal" style={{ transitionDelay:`${j*0.1}s`, background:'rgba(30,41,59,0.25)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:20, padding:28 }}>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14 }}>
                <img src={AV(p.id)} alt={p.n} style={{ width:44, height:44, borderRadius:'50%', border:'1px solid rgba(99,102,241,0.3)', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:.95, fontWeight:700, color:'#fff' }}>{p.n}</div>
                  <div style={{ fontSize:.78, color:'#818cf8', fontWeight:500 }}>{p.r}</div>
                </div>
              </div>
              <div style={{ fontSize:.82, color:'#64748b' }}>📖 {p.c}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DIVIDER WITH IMAGE ===== */}
      <section style={{ zIndex:1, margin:'140px auto 0', position:'relative', overflow:'hidden' }}>
        <div style={{ height:320, position:'relative', backgroundImage:`url(${PH('teacher-banner', 1400, 400)})`, backgroundSize:'cover', backgroundPosition:'center', backgroundAttachment:'fixed' }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,rgba(7,11,20,0.85) 0%,rgba(7,11,20,0.4) 50%,rgba(7,11,20,0.85) 100%)' }} />
          <div style={{ position:'relative', zIndex:1, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px', textAlign:'center' }}>
            <h2 className="reveal" style={{ fontSize:'2.2rem', fontWeight:900, color:'#fff', margin:'0 0 16px', letterSpacing:'-1px' }}>Your Classroom <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Deserves</span> a Website</h2>
            <p className="reveal" style={{ fontSize:'1.05rem', color:'#94a3b8', maxWidth:500 }}>Give your teaching career the professional online presence it deserves.</p>
          </div>
        </div>
      </section>

      {/* ===== THEMES ===== */}
      <section id="themes" style={{ zIndex:1, maxWidth:1100, margin:'120px auto 0', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:56 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>Themes</span>
          <h2 style={{ fontSize:'2.6rem', fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>Choose Your <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Style</span></h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
          {[
            { n:'Modern Indigo', c:['#4f46e5','#059669'] },
            { n:'Warm Amber', c:['#d97706','#b45309'] },
            { n:'Academic Navy', c:['#1e3a8a','#1e40af'] },
            { n:'Creative Magenta', c:['#db2777','#c026d3'] },
            { n:'Minimal Slate', c:['#0f172a','#334155'] },
            { n:'Emerald Forest', c:['#047857','#059669'] },
            { n:'Sunset Orange', c:['#ea580c','#7c3aed'] },
            { n:'Cyber STEM', c:['#0284c7','#0891b2'] },
          ].map((t,i)=>(
            <div key={i} className="r-s" style={{ transitionDelay:`${i*0.04}s`, background:'rgba(30,41,59,0.25)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:14, padding:18, textAlign:'center' }}>
              <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:10 }}>
                {t.c.map((c,j)=>(
                  <span key={j} style={{ width:40, height:40, borderRadius:12, background:c, display:'inline-block', boxShadow:`0 0 20px ${c}44` }} />
                ))}
              </div>
              <span style={{ fontSize:.85, color:'#cbd5e1', fontWeight:600 }}>{t.n}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" style={{ zIndex:1, maxWidth:1100, margin:'140px auto 0', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:56 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>Testimonials</span>
          <h2 style={{ fontSize:'2.6rem', fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>Loved by <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Educators</span></h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:24 }}>
          {[
            { id:5, name:'Maria Johnson', role:'High School Math Teacher', text:'I had zero coding experience. In 10 minutes I had a beautiful site that parents actually compliment. The chat wizard is genius.' },
            { id:6, name:'Ahmed Khan', role:'Science Department Head', text:'The Vercel deploy feature is incredible. My portfolio was live with my own URL before my coffee finished brewing.' },
            { id:7, name:'Lisa Rodriguez', role:'Elementary Educator', text:'Finally a tool designed for teachers, not developers. The themes are gorgeous and the CMS gives me full control.' },
          ].map((t,i)=>(
            <div key={i} className="r-s" style={{ transitionDelay:`${i*0.12}s`, background:'rgba(15,23,42,0.5)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:20, padding:'28px 28px 32px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                <img src={AV(t.id)} alt={t.name} style={{ width:44, height:44, borderRadius:'50%', border:'1px solid rgba(99,102,241,0.3)', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:.92, fontWeight:700, color:'#fff' }}>{t.name}</div>
                  <div style={{ fontSize:.8, color:'#818cf8' }}>{t.role}</div>
                </div>
                <span style={{ marginLeft:'auto', fontSize:'2rem', color:'#818cf8', opacity:0.3, lineHeight:1 }}>"</span>
              </div>
              <p style={{ fontSize:.88, color:'#94a3b8', lineHeight:1.7, fontStyle:'italic' }}>"{t.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TECH STACK ===== */}
      <section style={{ zIndex:1, maxWidth:900, margin:'140px auto 0', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:40 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>Technology</span>
          <h2 style={{ fontSize:'2.2rem', fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>Built With <span style={{ background:'linear-gradient(135deg,#34d399,#10b981)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Modern Stack</span></h2>
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
          {['HTML5','CSS3','JavaScript ES6+','Neon PostgreSQL','Next.js','Vercel','Responsive Design','Open Graph'].map((tech,i)=>(
            <span key={i} className="reveal" style={{ transitionDelay:`${i*0.05}s`, padding:'8px 18px', background:'rgba(30,41,59,0.3)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:999, fontSize:.82, color:'#94a3b8', fontWeight:500 }}>{tech}</span>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" style={{ zIndex:1, maxWidth:800, margin:'140px auto 0', padding:'0 24px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ display:'inline-block', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'#818cf8', marginBottom:10, padding:'3px 12px', background:'rgba(99,102,241,0.1)', borderRadius:999 }}>FAQ</span>
          <h2 style={{ fontSize:'2.6rem', fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>Got <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Questions?</span></h2>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { q:'Do I need coding experience?', a:'None at all. The chat wizard handles everything. You just answer simple questions about your teaching career and our system builds the complete website.' },
            { q:'Can I deploy to my own domain?', a:'Yes! Deploy to Vercel with a custom domain, or download the ZIP and host it on any web server.' },
            { q:'Is my data saved between sessions?', a:'If you register an account, your chat progress and portfolio data are automatically saved and restored the next time you visit.' },
            { q:'Can I edit after generation?', a:'Absolutely. Use the built-in CMS dashboard to tweak every detail — content, colors, layouts, images, and SEO.' },
          ].map((f,i)=>(
            <div key={i} className="reveal" style={{ transitionDelay:`${i*0.08}s`, background:'rgba(15,23,42,0.4)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, overflow:'hidden' }}>
              <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{ width:'100%', padding:'18px 24px', background:'none', border:'none', color:'#e2e8f0', fontSize:'.95rem', fontWeight:600, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', textAlign:'left', fontFamily:'inherit' }}>
                <span>{f.q}</span>
                <span style={{ transform:`rotate(${openFaq===i?180:0}deg)`, transition:'transform 0.3s', fontSize:'1.2rem', color:'#818cf8' }}>▾</span>
              </button>
              {openFaq===i && (
                <div style={{ padding:'0 24px 18px', color:'#94a3b8', fontSize:.88, lineHeight:1.7, animation:'accordionOpen 0.3s ease' }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ zIndex:1, textAlign:'center', padding:'140px 24px 100px' }}>
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:800, height:400, background:'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)', pointerEvents:'none', filter:'blur(80px)' }} />
        <div className="r-s" style={{ position:'relative', zIndex:1, maxWidth:700, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'center', gap:20, marginBottom:28 }}>
            {['🚀','🎨','🌍'].map((e,i)=>(
              <div key={i} style={{ width:56, height:56, borderRadius:14, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>{e}</div>
            ))}
          </div>
          <h2 style={{ fontSize:'clamp(2rem,5vw,2.8rem)', fontWeight:900, color:'#fff', margin:'0 0 16px', letterSpacing:'-1px' }}>Ready to Elevate Your Teaching Brand?</h2>
          <p style={{ fontSize:'1.1rem', color:'#94a3b8', marginBottom:36, lineHeight:1.7 }}>Join educators worldwide building stunning professional web portfolios. No code. No hassle. Just results.</p>
          <Link href="/build" style={{ padding:'18px 44px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', borderRadius:14, fontWeight:800, textDecoration:'none', fontSize:'1.1rem', boxShadow:'0 12px 40px rgba(99,102,241,0.4)', display:'inline-flex', alignItems:'center', gap:10 }}>
            🚀 Build Your Portfolio Now
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 19 12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <p style={{ fontSize:.8, color:'#475569', marginTop:20 }}>Free to start • No credit card required • Download or deploy</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ zIndex:1, borderTop:'1px solid rgba(255,255,255,0.04)', padding:'40px 48px', background:'#050810' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}><Logo size={24} /><span style={{ fontSize:.85, color:'#475569', fontWeight:600 }}>TeacherFolio</span></div>
          <div style={{ display:'flex', gap:24 }}>{['Build','CMS','Privacy','Terms'].map((l,i)=>(
            <Link key={i} href={['/build','/cms','/','/'][i]} style={{ fontSize:.82, color:'#64748b', textDecoration:'none' }}>{l}</Link>
          ))}</div>
          <p style={{ fontSize:.8, color:'#475569', margin:0 }}>© 2026 TeacherFolio. Empowering educators worldwide.</p>
        </div>
      </footer>

      <AuthModal isOpen={isAuthOpen} onClose={()=>setIsAuthOpen(false)} onAuthSuccess={(u)=>setUser(u)} />
    </div>
  );
}
