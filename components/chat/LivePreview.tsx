'use client';

import { useMemo, useState } from 'react';
import { getThemeById, getAllThemes } from '@/lib/themes';
import { renderSection } from '@/lib/sections';
import type { TeacherData } from '@/lib/conversation';

function esc(s: string) {
  return s ? s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}

export function LivePreview({ data }: { data: TeacherData }) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const theme = useMemo(() => getThemeById(data.theme || 'theme-1') || getAllThemes()[0], [data.theme]);
  const style = (data as any).style || {};
  const customSections = (data as any).customSections || [];

  const srcDoc = useMemo(() => {
    const c = theme.colors;
    const rad = ({ sharp: '4px', rounded: '12px', pill: '32px' } as any)[style.roundness || theme.layout.roundness || 'rounded'] || '12px';
    const sh = ({ none: 'none', soft: '0 1px 3px rgba(0,0,0,.12)', medium: '0 4px 12px rgba(0,0,0,.15)', deep: '0 8px 24px rgba(0,0,0,.22)' } as any)[style.shadowDepth || theme.layout.shadowDepth || 'soft'] || '0 1px 3px rgba(0,0,0,.12)';
    const sp = ({ compact: '42px', normal: '70px', spacious: '110px' } as any)[style.spacing || theme.layout.spacing || 'normal'] || '70px';

    const hasName = !!data.name;
    const hasSubject = !!data.subject;
    const hasYears = !!data.years;
    const hasBio = !!data.bio;
    const hasCourses = (data.courses || []).length > 0;
    const hasQuote = !!data.quote;
    const hasAchievements = !!data.achievements;
    const hasEmail = !!data.email;
    const hasPhone = !!(data as any).phone;
    const hasCustom = customSections.length > 0;

    const showAbout = hasBio || hasYears || hasName;
    const showCourses = hasCourses || hasSubject;
    const showPhilosophy = hasQuote;
    const showAchievements = hasAchievements;
    const showContact = hasEmail || hasPhone;

    const heroEyebrow = hasSubject ? esc(data.subject) : hasName ? 'Educator Portfolio' : 'TeacherFolio';
    const heroTitle = hasName ? `Hello, I'm <span class="hl">${esc(data.name)}</span>` : `Your teaching website <span class="hl">starts here</span>`;
    const heroDesc = hasBio ? esc(data.bio.slice(0, 160)) : hasName ? `${hasSubject ? esc(data.subject) + ' educator' : 'Passionate educator'} — your story will build here as you chat.` : 'Chat on the left — this preview builds step-by-step as you answer.';
    const initials = hasName ? data.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'TF';
    const photo = /^(https?:\/\/|\/\/|\/|data:image\/)/i.test(data.photo || '') ? esc(data.photo) : '';
    const gallery = (data.gallery || []).filter((g) => /^(https?:\/\/|\/\/|\/|data:image\/)/i.test(g || '')).map(esc);
    const avatarHtml = photo
      ? `<img src="${photo}" alt="Profile photo" style="width:84px;height:84px;object-fit:cover;border-radius:50%;display:block;margin:12px auto 0;border:3px solid var(--p);box-shadow:0 4px 16px rgba(0,0,0,.25)" />`
      : `<div class="avatar">${esc(initials)}</div>`;
    const galleryHtml = gallery.length > 0
      ? `<section class="section" style="background:var(--surface)"><div class="container"><h2 class="section__title">Gallery</h2><p class="section__sub">Moments from my classroom</p><div class="gallery">${gallery.slice(0, 6).map((g) => `<img src="${g}" alt="Gallery photo" loading="lazy" />`).join('')}</div></div></section>`
      : '';
    const step = [hasName, hasSubject || hasCourses, hasYears || hasBio, hasQuote].filter(Boolean).length;

    const aboutHtml = showAbout
      ? `<section class="section"><div class="container"><h2 class="section__title">About Me</h2>${hasBio ? `<p class="section__sub">${esc(data.bio.slice(0, 180))}</p>` : `<p class="section__sub muted">Share your bio in chat to fill this section.</p>`}<div class="stats">
          ${hasYears ? `<div class="stat"><strong>${esc(data.years)}<span>+</span></strong><span>Years</span></div>` : ''}
          <div class="stat"><strong>${hasCourses ? (data.courses || []).length : hasSubject ? '1' : '—'}</strong><span>Courses</span></div>
          <div class="stat"><strong>${hasSubject ? esc(data.subject) : '—'}</strong><span>Subject</span></div>
        </div></div></section>`
      : '';

    const coursesHtml = showCourses
      ? `<section class="section" style="background:var(--surface)"><div class="container"><h2 class="section__title">Courses</h2><p class="section__sub">${hasCourses ? esc((data.courses || []).join(' · ')) : 'Courses in ' + esc(data.subject)}</p><div class="grid2">
          ${(hasCourses ? (data.courses || []) : [data.subject]).map((co: string) => `<div class="card"><div class="card__icon">📘</div><strong>${esc(co)}</strong><p>Engaging ${esc(co.toLowerCase())} instruction.</p><span class="pill">All Levels</span></div>`).join('')}
        </div></div></section>`
      : '';

    const philosophyHtml = showPhilosophy ? `<section class="section"><div class="container"><h2 class="section__title">Teaching Philosophy</h2><div class="quote">“${esc(data.quote)}”<div class="quote__by">— ${esc(data.name || 'You')}</div></div></div></section>` : '';
    const achievementsHtml = showAchievements ? `<section class="section" style="background:var(--surface)"><div class="container"><h2 class="section__title">Achievements</h2><div class="card"><span class="eyebrow">${esc(new Date().getFullYear().toString())}</span><strong>${esc(data.achievements.split(',')[0].slice(0, 80))}</strong><p>${esc(data.achievements.slice(0, 140))}</p></div></div></section>` : '';
    const customHtml = hasCustom ? customSections.filter((cs: any) => Array.isArray(cs.blocks) && cs.blocks.length).map((cs: any) => renderSection(cs)).join('') : '';
    const contactHtml = showContact ? `<section class="section"><div class="container"><h2 class="section__title">Get in Touch</h2><p class="section__sub">${hasEmail ? esc(data.email) : ''} ${hasPhone ? ' · ' + esc((data as any).phone) : ''}</p></div></section>` : '';

    const upcoming: string[] = [];
    if (!showAbout) upcoming.push('About');
    if (!showCourses) upcoming.push('Courses');
    if (!showPhilosophy) upcoming.push('Philosophy');
    if (!showAchievements) upcoming.push('Achievements');
    if (!showContact) upcoming.push('Contact');
    const roadmapHtml = upcoming.length && (hasName || hasSubject || hasCourses) ? `<div class="roadmap"><div class="roadmap__label">Up next</div><div class="roadmap__pills">${upcoming.map((u) => `<span class="roadmap__pill">🔒 ${u}</span>`).join('')}</div></div>` : '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      :root{--p:${c.primary};--a:${c.accent};--bg:${c.background};--surface:${c.surface};--text:${c.text};--muted:${c.muted};--border:${c.border};--rad:${rad};--shadow:${sh};--sp:${sp}}
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Inter,system-ui,sans-serif;color:var(--text);line-height:1.6;background:var(--bg);-webkit-font-smoothing:antialiased}
      .nav{position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--border);padding:10px 0}
      .container{max-width:780px;margin:0 auto;padding:0 18px}
      .logo{font-weight:800;color:var(--p);font-size:.82rem}
      .hero{padding:28px 0;text-align:center}
      .hero__eyebrow{font-size:.62rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--p)}
      .hero__title{font-size:1.65rem;font-weight:800;line-height:1.15;margin:8px 0;color:var(--text)}
      .hero__title .hl{color:var(--p)}
      .hero__desc{font-size:.84rem;color:var(--muted);max-width:520px;margin:8px auto 0}
      .avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--a));display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.8rem;margin:12px auto 0}
      .section{padding:var(--sp) 0}
      .section__title{font-size:1.12rem;font-weight:800;text-align:center;margin-bottom:6px}
      .section__sub{font-size:.82rem;color:var(--muted);text-align:center;margin-bottom:14px}
      .section__sub.muted{font-style:italic;opacity:.9}
      .stats{display:flex;gap:10px;justify-content:space-around;background:var(--surface);border:1px solid var(--border);border-radius:var(--rad);padding:14px;box-shadow:var(--shadow)}
      .stat{text-align:center} .stat strong{font-size:1.15rem;color:var(--p);display:block} .stat span{font-size:.62rem;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px} @media(max-width:640px){.grid2{grid-template-columns:1fr}}
      .card{padding:14px;border:1px solid var(--border);border-radius:var(--rad);background:var(--surface);box-shadow:var(--shadow)}
      .card__icon{font-size:1.05rem;margin-bottom:6px} .card strong{font-size:.88rem;display:block;margin-bottom:4px} .card p{font-size:.78rem;color:var(--muted);margin:0 0 8px}
      .pill{font-size:.62rem;font-weight:700;background:var(--border);color:var(--a);padding:3px 9px;border-radius:999px}
      .eyebrow{font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--p);background:var(--border);padding:3px 9px;border-radius:999px}
      .quote{background:var(--surface);padding:16px 18px;border-left:4px solid var(--p);border-radius:0 var(--rad) var(--rad) 0;font-style:italic;box-shadow:var(--shadow);max-width:640px;margin:0 auto}
      .quote__by{margin-top:8px;font-style:normal;font-weight:700;font-size:.78rem;color:var(--muted)}
      .foot{padding:14px 0;text-align:center;font-size:.72rem;color:var(--muted);border-top:1px solid var(--border);margin-top:10px}
      .badge{font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--p);border:1px solid var(--border);padding:4px 10px;border-radius:999px;display:inline-block;margin-bottom:10px}
      .progress{height:3px;background:var(--border);border-radius:999px;overflow:hidden;margin:10px auto 0;max-width:220px} .progress__fill{height:100%;background:linear-gradient(90deg,var(--p),var(--a))}
      .roadmap{margin:16px auto 0;max-width:520px;border:1px dashed var(--border);border-radius:var(--rad);padding:10px 12px}
      .roadmap__label{font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-align:center;margin-bottom:6px}
      .roadmap__pills{display:flex;flex-wrap:wrap;gap:6px;justify-content:center} .roadmap__pill{font-size:.66rem;color:var(--muted);background:var(--bg);border:1px solid var(--border);padding:4px 9px;border-radius:999px}
      .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px} .gallery img{width:100%;height:110px;object-fit:cover;border-radius:10px;border:1px solid var(--border);display:block} @media(max-width:640px){.gallery{grid-template-columns:repeat(2,1fr)}}
    </style></head><body>
      <div class="nav"><div class="container" style="display:flex;justify-content:space-between;align-items:center"><span class="logo">${esc(theme.name)} · Preview</span><span style="font-size:.62rem;color:var(--muted)">${hasName ? esc(data.name) : step ? 'Building…' : 'Start chatting →'}</span></div></div>
      <div class="container"><div class="progress"><div class="progress__fill" style="width:${Math.min(100, Math.round((step/4)*100))}%"></div></div></div>
      <section class="hero"><div class="container"><div class="badge">Step ${Math.max(1, step)} of 4</div><div class="hero__eyebrow">${heroEyebrow}</div><h1 class="hero__title">${heroTitle}</h1><p class="hero__desc">${heroDesc}</p>${avatarHtml}</div></section>
      ${aboutHtml}
      ${coursesHtml}
      ${philosophyHtml}
      ${achievementsHtml}
      ${galleryHtml}
      ${customHtml}
      ${contactHtml}
      ${roadmapHtml}
      <footer class="foot"><div class="container">© ${new Date().getFullYear()} ${hasName ? esc(data.name) : 'Your Portfolio'} · TeacherFolio</div></footer>
    </body></html>`;
  }, [data, theme, style, customSections]);

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] border-l border-white/[0.06]">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[0.68rem] font-bold tracking-[0.08em] uppercase text-slate-300">Live Preview</span>
        <span className="ml-1 text-[0.6rem] text-slate-500 hidden sm:inline">instant</span>
        <div className="ml-auto flex gap-1">
          {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
            <button key={d} onClick={() => setDevice(d)} className={`px-2.5 py-1 rounded-lg text-[0.68rem] font-semibold border transition-colors ${device === d ? 'bg-white text-slate-900 border-white' : 'bg-transparent text-slate-500 border-white/10 hover:text-slate-300'}`} >
              {d === 'desktop' ? '🖥 Desktop' : d === 'tablet' ? 'Tablet' : 'Mobile'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-[#0b0f1a] overflow-auto flex justify-center p-3">
        <iframe
          title="Live site preview"
          srcDoc={srcDoc}
          className={`bg-white border border-white/10 shadow-2xl rounded-xl overflow-hidden ${device === 'mobile' ? 'w-[375px] max-w-full' : device === 'tablet' ? 'w-[768px] max-w-full' : 'w-full'} h-full min-h-[520px]`}
          style={{ colorScheme: 'light' }}
          loading="eager"
        />
      </div>
      <div className="px-3 py-2 border-t border-white/[0.06] bg-white/[0.02] text-[0.65rem] text-slate-500 flex items-center gap-2">
        <span className="truncate">Theme: <strong className="text-slate-300">{theme.name}</strong> · {theme.category}</span>
        <span className="ml-auto text-slate-600 hidden sm:inline">Updates with every message</span>
      </div>
    </div>
  );
}
