// ──────────────────────────────────────────────
//  Custom Section Designer — shared data model,
//  template gallery, and a pure HTML renderer
//  used by the CMS editor, live preview, and the
//  static site build. Teachers can compose any
//  section from blocks in any shape/size.
// ──────────────────────────────────────────────

export type SectionLayout = 'stack' | 'two' | 'three' | 'grid' | 'split' | 'band';
export type BlockType = 'heading' | 'text' | 'image' | 'button' | 'card' | 'stat' | 'list' | 'quote' | 'divider' | 'spacer' | 'html' | 'booking' | 'newsletter' | 'file' | 'video' | 'faq' | 'table' | 'countdown' | 'map' | 'review-form';

export interface SectionBlock {
  id: string;
  type: BlockType;
  text?: string;
  level?: number;
  src?: string;
  alt?: string;
  href?: string;
  label?: string;
  items?: string[];
  attribution?: string;
  icon?: string;
  title?: string;
  number?: string;
  suffix?: string;
  /** Raw HTML for `html` blocks (teacher-authored, rendered unescaped). */
  html?: string;
  /** Target datetime (ISO) for `countdown` blocks. */
  datetime?: string;
}

export interface CustomSection {
  id: string;
  title: string;
  badge: string;
  subtitle: string;
  showHeader: boolean;
  layout: SectionLayout;
  bg: string;
  bgStyle: 'plain' | 'alt' | 'gradient' | 'pattern';
  pattern: string;
  padding: 'compact' | 'normal' | 'spacious';
  radius: 'sharp' | 'rounded' | 'pill';
  align: 'left' | 'center';
  maxWidth: 'narrow' | 'normal' | 'wide' | 'full';
  blocks: SectionBlock[];
  /** Teacher-authored CSS scoped to this section (emitted inside a <style> tag). */
  customCss?: string;
}

export function escHtml(s: string): string {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function makeId(prefix = 'sec'): string {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function blockId(): string {
  return 'blk-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function newBlock(type: BlockType, partial: Partial<SectionBlock> = {}): SectionBlock {
  const defaults: Record<BlockType, Partial<SectionBlock>> = {
    heading: { text: 'Section heading', level: 2 },
    text: { text: 'Write a paragraph of text here…' },
    image: { src: '', alt: '' },
    button: { label: 'Learn more', href: '#' },
    card: { icon: '✨', title: 'Card title', text: 'Short description for this card.' },
    stat: { number: '99', suffix: '%', label: 'Success rate' },
    list: { items: ['First item', 'Second item', 'Third item'] },
    quote: { text: 'A great quote about teaching.', attribution: '— Someone' },
    divider: {},
    spacer: { text: '24' },
    html: { html: '<p style="color:#cbd5e1">Your custom HTML here…</p>' },
    booking: { title: 'Book a Meeting', text: 'Pick a time that suits you — I will confirm shortly.' },
    newsletter: { title: 'Stay in the Loop', text: 'Class updates and resources, once a month. No spam.' },
    file: { title: 'Course Syllabus', text: 'Download the PDF below.', src: '' },
    video: { title: '', src: '' },
    faq: { items: ['What should I bring to class? ||| Just yourself and a notebook — everything else is provided.', 'Do you offer extra help? ||| Yes! See office hours on the schedule page.'] },
    table: { title: 'Schedule', items: ['Day | Time | Room', 'Mon | 9:00 – 10:30 | A101', 'Wed | 9:00 – 10:30 | A101'] },
    countdown: { title: 'Enrollment closes in', datetime: '' },
    map: { title: 'Find Us', src: '' },
    'review-form': { title: 'Share Your Experience', text: 'Were you in my class? I would love to hear from you.' },
  };
  return { id: blockId(), type, ...defaults[type], ...partial };
}

export const BLOCK_META: { type: BlockType; label: string; icon: string }[] = [
  { type: 'heading', label: 'Heading', icon: '🔤' },
  { type: 'text', label: 'Text', icon: '📝' },
  { type: 'image', label: 'Image', icon: '🖼' },
  { type: 'button', label: 'Button', icon: '🔗' },
  { type: 'card', label: 'Card', icon: '🃏' },
  { type: 'stat', label: 'Stat', icon: '📊' },
  { type: 'list', label: 'List', icon: '📋' },
  { type: 'quote', label: 'Quote', icon: '💬' },
  { type: 'divider', label: 'Divider', icon: '➖' },
  { type: 'spacer', label: 'Spacer', icon: '📐' },
  { type: 'html', label: 'Custom HTML', icon: '</>' },
  { type: 'booking', label: 'Booking Form', icon: '📅' },
  { type: 'newsletter', label: 'Newsletter', icon: '✉️' },
  { type: 'file', label: 'File Download', icon: '📎' },
  { type: 'video', label: 'Video', icon: '🎬' },
  { type: 'faq', label: 'FAQ Accordion', icon: '❓' },
  { type: 'table', label: 'Table', icon: '🗂' },
  { type: 'countdown', label: 'Countdown', icon: '⏳' },
  { type: 'map', label: 'Map', icon: '📍' },
  { type: 'review-form', label: 'Review Form', icon: '✍️' },
];

export const LAYOUT_META: { id: SectionLayout; label: string; desc: string }[] = [
  { id: 'stack', label: 'Stack', desc: 'Blocks in a single column' },
  { id: 'two', label: '2 Columns', desc: 'Side by side' },
  { id: 'three', label: '3 Columns', desc: 'Three across' },
  { id: 'grid', label: 'Grid', desc: 'Auto-fit cards' },
  { id: 'split', label: 'Split', desc: 'Media + text' },
  { id: 'band', label: 'Band', desc: 'Wide centered' },
];

const RADIUS_VALUES: Record<CustomSection['radius'], string> = { sharp: '6px', rounded: '14px', pill: '32px' };
const PADDING_VALUES: Record<CustomSection['padding'], string> = { compact: '48px', normal: '96px', spacious: '140px' };
const MAXW_VALUES: Record<CustomSection['maxWidth'], string> = { narrow: '720px', normal: '980px', wide: '1200px', full: '100%' };

const PRIMARY = 'var(--color-primary, #4f46e5)';
const ACCENT = 'var(--color-accent, #059669)';

function layoutCols(layout: SectionLayout): string {
  switch (layout) {
    case 'two': return 'repeat(2, 1fr)';
    case 'three': return 'repeat(3, 1fr)';
    case 'grid': return 'repeat(auto-fill, minmax(230px, 1fr))';
    case 'split': return 'minmax(0, 1.1fr) minmax(0, 1fr)';
    default: return '1fr';
  }
}

function renderBlock(b: SectionBlock, cls: string): string {
  const rad = RADIUS_VALUES.rounded;
  switch (b.type) {
    case 'heading':
      const lv = b.level || 2;
      const size = lv === 1 ? '1.6rem' : lv === 2 ? '1.25rem' : '1rem';
      return `<h${lv} class="${cls}__heading" style="font-size:${size};font-weight:800;color:#fff;margin:0;line-height:1.25">${escHtml(b.text || '')}</h${lv}>`;
    case 'text':
      return `<p class="${cls}__text" style="font-size:.9rem;color:#cbd5e1;line-height:1.7;margin:0">${escHtml(b.text || '')}</p>`;
    case 'image':
      return `<div class="${cls}__imgwrap"><img src="${escHtml(b.src || '')}" alt="${escHtml(b.alt || '')}" style="width:100%;border-radius:${rad};object-fit:cover;display:block;background:#111827;min-height:120px" loading="lazy" /></div>`;
    case 'button':
      return `<a class="${cls}__btn" href="${escHtml(b.href || '#')}" target="${b.href?.startsWith('http') ? '_blank' : '_self'}" rel="noopener" style="display:inline-block;padding:.7rem 1.5rem;border-radius:999px;font-weight:700;font-size:.8rem;color:#fff;text-decoration:none;background:linear-gradient(135deg,${PRIMARY},${ACCENT});box-shadow:0 4px 16px rgba(0,0,0,0.25);transition:transform .15s">${escHtml(b.label || '')}</a>`;
    case 'card':
      return `<div class="${cls}__card" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:${rad};padding:20px;backdrop-filter:blur(8px)"><div style="font-size:1.4rem;margin-bottom:8px">${b.icon || ''}</div><h4 style="font-size:.95rem;font-weight:700;color:#fff;margin:0 0 6px">${escHtml(b.title || '')}</h4><p style="font-size:.8rem;color:#94a3b8;line-height:1.6;margin:0">${escHtml(b.text || '')}</p></div>`;
    case 'stat':
      return `<div class="${cls}__card" style="text-align:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:${rad};padding:24px 16px"><strong style="font-size:1.7rem;font-weight:800;color:${PRIMARY};display:block">${escHtml(b.number || '0')}${escHtml(b.suffix || '')}</strong><span style="font-size:.7rem;color:#94a3b8">${escHtml(b.label || '')}</span></div>`;
    case 'list':
      return `<ul class="${cls}__list" style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px">${(b.items || []).map(it => `<li style="display:flex;gap:8px;align-items:flex-start;font-size:.85rem;color:#cbd5e1"><span style="color:${ACCENT};font-weight:800">✓</span>${escHtml(it)}</li>`).join('')}</ul>`;
    case 'quote':
      return `<blockquote class="${cls}__quote" style="margin:0;padding:18px 20px;border-left:4px solid ${PRIMARY};background:rgba(255,255,255,0.04);border-radius:0 ${rad} ${rad} 0;font-style:italic;font-size:.9rem;color:#e2e8f0;line-height:1.6"><p style="margin:0 0 6px">"${escHtml(b.text || '')}"</p>${b.attribution ? `<footer style="font-size:.72rem;color:#94a3b8;font-style:normal;margin-top:6px">${escHtml(b.attribution)}</footer>` : ''}</blockquote>`;
    case 'divider':
      return `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:0" />`;
    case 'spacer':
      return `<div style="height:${Math.max(4, parseInt(b.text || '24') || 24)}px"></div>`;
    case 'html':
      // Teacher-authored markup. Script tags are stripped for safety;
      // everything else renders as-is on the teacher's own site.
      return `<div class="${cls}__html">${(b.html || '').replace(/<script[\s\S]*?<\/script\s*>/gi, '')}</div>`;
    case 'booking': {
      // Office-hours booking form. {{TEACHER_ID}} is replaced at build time;
      // the site script wires submission + slot loading (see runBuild).
      return `<div class="${cls}__booking" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:${rad};padding:24px;backdrop-filter:blur(8px)">
        ${b.title ? `<h4 style="font-size:1rem;font-weight:800;color:#fff;margin:0 0 4px">${escHtml(b.title)}</h4>` : ''}
        ${b.text ? `<p style="font-size:.82rem;color:#94a3b8;margin:0 0 16px;line-height:1.6">${escHtml(b.text)}</p>` : ''}
        <form data-booking-form data-teacher-id="{{TEACHER_ID}}" style="display:flex;flex-direction:column;gap:10px">
          <input name="name" required maxlength="80" placeholder="Your name" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none" />
          <input name="email" type="email" required maxlength="120" placeholder="Email address" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none" />
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <input name="date" type="date" required style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none" />
            <select name="time" required style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none"><option value="">Time…</option></select>
          </div>
          <textarea name="note" maxlength="500" rows="2" placeholder="What would you like to discuss? (optional)" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none;resize:vertical"></textarea>
          <button type="submit" style="padding:.7rem 1.5rem;border-radius:999px;font-weight:700;font-size:.82rem;color:#fff;border:none;cursor:pointer;background:linear-gradient(135deg,${PRIMARY},${ACCENT})">Request Booking</button>
          <p data-booking-msg style="font-size:.78rem;margin:0;min-height:1.2em;color:#94a3b8"></p>
        </form>
      </div>`;
    }
    case 'newsletter': {
      return `<div class="${cls}__newsletter" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:${rad};padding:24px;backdrop-filter:blur(8px);text-align:center">
        ${b.title ? `<h4 style="font-size:1rem;font-weight:800;color:#fff;margin:0 0 4px">${escHtml(b.title)}</h4>` : ''}
        ${b.text ? `<p style="font-size:.82rem;color:#94a3b8;margin:0 0 16px;line-height:1.6">${escHtml(b.text)}</p>` : ''}
        <form data-newsletter-form data-teacher-id="{{TEACHER_ID}}" style="display:flex;gap:8px;max-width:420px;margin:0 auto">
          <input name="email" type="email" required maxlength="160" placeholder="you@example.com" style="flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none" />
          <button type="submit" style="padding:.7rem 1.4rem;border-radius:10px;font-weight:700;font-size:.82rem;color:#fff;border:none;cursor:pointer;background:linear-gradient(135deg,${PRIMARY},${ACCENT});white-space:nowrap">Subscribe</button>
        </form>
        <p data-newsletter-msg style="font-size:.78rem;margin:8px 0 0;min-height:1.2em;color:#94a3b8"></p>
      </div>`;
    }
    case 'file': {
      const href = escHtml(b.src || '#');
      return `<a href="${href}" ${/^https?:\/\//i.test(b.src || '') ? 'target="_blank" rel="noopener"' : ''} download style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:${rad};padding:16px 18px;text-decoration:none;transition:transform .15s">
        <span style="font-size:1.5rem">📄</span>
        <span><strong style="display:block;font-size:.9rem;color:#fff">${escHtml(b.title || 'Download file')}</strong>
        ${b.text ? `<span style="font-size:.76rem;color:#94a3b8">${escHtml(b.text)}</span>` : ''}</span>
        <span style="margin-left:auto;font-size:.78rem;font-weight:800;color:${ACCENT}">⤓</span>
      </a>`;
    }
    case 'video': {
      const url = (b.src || '').trim();
      const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
      const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      const inner = yt
        ? `<iframe src="https://www.youtube.com/embed/${yt[1]}" title="${escHtml(b.title || 'Video')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:none;border-radius:${rad};display:block;background:#000"></iframe>`
        : vm
          ? `<iframe src="https://player.vimeo.com/video/${vm[1]}" title="${escHtml(b.title || 'Video')}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:none;border-radius:${rad};display:block;background:#000"></iframe>`
          : url
            ? `<video src="${escHtml(url)}" controls preload="metadata" style="width:100%;border-radius:${rad};display:block;background:#000;max-height:420px"></video>`
            : `<div style="padding:28px;text-align:center;color:#64748b;border:1px dashed rgba(255,255,255,0.12);border-radius:${rad};font-size:.82rem">Paste a YouTube, Vimeo or MP4 link to show a video.</div>`;
      return `${b.title ? `<h4 style="font-size:.95rem;font-weight:700;color:#fff;margin:0 0 8px">${escHtml(b.title)}</h4>` : ''}${inner}`;
    }
    case 'faq': {
      const pairs = (b.items || []).map(it => {
        const i = it.indexOf('|||');
        return i < 0 ? { q: it.trim(), a: '' } : { q: it.slice(0, i).trim(), a: it.slice(i + 3).trim() };
      }).filter(p => p.q);
      if (!pairs.length) return `<div style="padding:20px;text-align:center;color:#64748b;border:1px dashed rgba(255,255,255,0.12);border-radius:${rad};font-size:.82rem">Add questions to build your FAQ.</div>`;
      return `<div style="display:flex;flex-direction:column;gap:8px">${pairs.map(p =>
        `<details style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:${rad};padding:12px 16px">`
        + `<summary style="cursor:pointer;font-weight:700;font-size:.88rem;color:#fff;list-style:none">${escHtml(p.q)}</summary>`
        + (p.a ? `<p style="font-size:.82rem;color:#94a3b8;line-height:1.6;margin:8px 0 0">${escHtml(p.a)}</p>` : '')
        + `</details>`).join('')}</div>`;
    }
    case 'table': {
      const rows = (b.items || []).map(r => String(r).split('|').map(c => c.trim())).filter(r => r.some(c => c));
      if (!rows.length) return '';
      const head = rows[0];
      const body = rows.slice(1);
      return `${b.title ? `<h4 style="font-size:.95rem;font-weight:700;color:#fff;margin:0 0 10px">${escHtml(b.title)}</h4>` : ''}`
        + `<div style="overflow-x:auto;border:1px solid rgba(255,255,255,0.08);border-radius:${rad}"><table style="width:100%;border-collapse:collapse;font-size:.82rem">`
        + `<thead><tr>${head.map(h => `<th style="text-align:left;padding:10px 14px;background:rgba(255,255,255,0.05);color:#fff;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.08);white-space:nowrap">${escHtml(h)}</th>`).join('')}</tr></thead>`
        + `<tbody>${body.map(r => `<tr>${head.map((_, i) => `<td style="padding:10px 14px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.05)">${escHtml(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody>`
        + `</table></div>`;
    }
    case 'countdown': {
      const t = Date.parse(b.datetime || '');
      if (!Number.isFinite(t)) return `<div style="padding:20px;text-align:center;color:#64748b;border:1px dashed rgba(255,255,255,0.12);border-radius:${rad};font-size:.82rem">Set a target date to start the countdown.</div>`;
      const cell = (k: string, label: string) =>
        `<div style="text-align:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:${rad};padding:14px 8px;min-width:70px"><strong data-cd="${k}" style="font-size:1.5rem;font-weight:800;color:${PRIMARY};display:block">–</strong><span style="font-size:.62rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">${label}</span></div>`;
      return `${b.title ? `<h4 style="font-size:1rem;font-weight:800;color:#fff;text-align:center;margin:0 0 12px">${escHtml(b.title)}</h4>` : ''}`
        + `<div data-countdown="${new Date(t).toISOString()}" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${cell('d', 'days')}${cell('h', 'hours')}${cell('m', 'mins')}${cell('s', 'secs')}</div>`;
    }
    case 'map': {
      const q = (b.src || '').trim();
      if (!q) return `<div style="padding:28px;text-align:center;color:#64748b;border:1px dashed rgba(255,255,255,0.12);border-radius:${rad};font-size:.82rem">Enter an address to show a map.</div>`;
      const src = /^https?:\/\//i.test(q) && /output=embed/.test(q)
        ? q
        : `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
      return `${b.title ? `<h4 style="font-size:.95rem;font-weight:700;color:#fff;margin:0 0 10px">${escHtml(b.title)}</h4>` : ''}`
        + `<iframe src="${escHtml(src)}" title="Map" loading="lazy" style="width:100%;height:320px;border:1px solid rgba(255,255,255,0.08);border-radius:${rad};display:block"></iframe>`;
    }
    case 'review-form': {
      return `<div class="${cls}__review" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:${rad};padding:24px;backdrop-filter:blur(8px)">
        ${b.title ? `<h4 style="font-size:1rem;font-weight:800;color:#fff;margin:0 0 4px">${escHtml(b.title)}</h4>` : ''}
        ${b.text ? `<p style="font-size:.82rem;color:#94a3b8;margin:0 0 16px;line-height:1.6">${escHtml(b.text)}</p>` : ''}
        <form data-review-form data-teacher-id="{{TEACHER_ID}}" style="display:flex;flex-direction:column;gap:10px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <input name="name" required maxlength="60" placeholder="Your name" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none" />
            <input name="context" maxlength="120" placeholder="Class of 2024 (optional)" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none" />
          </div>
          <textarea name="text" required maxlength="800" rows="3" placeholder="What was class like?" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none;resize:vertical"></textarea>
          <button type="submit" style="align-self:flex-start;padding:.7rem 1.5rem;border-radius:999px;font-weight:700;font-size:.82rem;color:#fff;border:none;cursor:pointer;background:linear-gradient(135deg,${PRIMARY},${ACCENT})">Submit Review</button>
          <p data-review-msg style="font-size:.78rem;margin:0;min-height:1.2em;color:#94a3b8"></p>
        </form>
      </div>`;
    }
    default:
      return '';
  }
}

/**
 * Scope teacher CSS to one section: each top-level selector group gets
 * prefixed with `.<cls> ` unless it already targets the section class,
 * an at-rule (@media/@keyframes), or a keyframe step (from/to/50%).
 */
export function scopeCss(css: string, cls: string): string {
  // Strip comments + script/closing-style breakouts for safety.
  const clean = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<\/style\s*>/gi, '')
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '');
  const out: string[] = [];
  // Split top-level rule blocks (handles one level of nesting, e.g. @media).
  let depth = 0;
  let current = '';
  const blocks: string[] = [];
  for (const ch of clean) {
    current += ch;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth <= 0) {
        blocks.push(current);
        current = '';
        depth = 0;
      }
    }
  }
  if (current.trim()) blocks.push(current);
  for (const block of blocks) {
    const brace = block.indexOf('{');
    if (brace < 0) continue;
    const selector = block.slice(0, brace).trim();
    const body = block.slice(brace);
    if (!selector) continue;
    if (/^@(media|supports|container)/i.test(selector)) {
      // Recurse into the at-rule body.
      const inner = body.slice(1, body.lastIndexOf('}'));
      out.push(`${selector}{${scopeCss(inner, cls)}}`);
    } else if (/^@/.test(selector) || /^(from|to|\d+%)$/.test(selector)) {
      out.push(`${selector}${body}`);
    } else {
      const scoped = selector
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => (s.includes(`.${cls}`) || s === ':root' ? s : `.${cls} ${s}`))
        .join(', ');
      out.push(`${scoped}${body}`);
    }
  }
  return out.join('\n');
}

/** Render a custom section to HTML (used by build + CMS preview + editor mini-preview) */
export function renderSection(s: CustomSection): string {
  const cls = 'csx-' + s.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const rad = RADIUS_VALUES[s.radius || 'rounded'];
  const pad = PADDING_VALUES[s.padding || 'normal'];
  const maxw = MAXW_VALUES[s.maxWidth || 'normal'];
  const align = s.align || 'left';
  const textAlign = align === 'center' ? 'center' : 'left';

  let bgStyle = '';
  if (s.bgStyle === 'gradient') {
    bgStyle = `background:linear-gradient(135deg,rgba(79,70,229,0.18),rgba(5,150,105,0.14))`;
  } else if (s.bgStyle === 'pattern') {
    const pats: Record<string, string> = {
      dots: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px) 0 0 / 22px 22px',
      grid: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 44px 44px, linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 44px 44px',
      waves: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'20\' viewBox=\'0 0 100 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10\' fill=\'none\' stroke=\'rgba(255,255,255,0.05)\' stroke-width=\'1\'/%3E%3C/svg%3E") 0 0 / 100px 20px',
      diagonal: 'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.04) 75%, transparent 75%, transparent) 0 0 / 34px 34px',
    };
    bgStyle = `background-image:${pats[s.pattern] || pats.dots};background-color:${s.bg || '#111827'}`;
  } else if (s.bgStyle === 'alt') {
    bgStyle = `background-color:${s.bg || '#111827'}`;
  } else {
    bgStyle = `background-color:${s.bg || 'transparent'}`;
  }

  const gridCols = layoutCols(s.layout || 'stack');

  const blocksHtml = (s.blocks || []).map(b => renderBlock(b, cls)).join('\n    ');

  const header = s.showHeader !== false && (s.title || s.badge || s.subtitle) ? `
    <div class="${cls}__header" style="max-width:${maxw};margin:0 auto ${pad === '48px' ? '24px' : '40px'} auto;text-align:${textAlign}">
      ${s.badge ? `<span style="display:inline-block;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:${ACCENT};background:rgba(5,150,105,0.12);padding:4px 12px;border-radius:999px;margin-bottom:10px">${escHtml(s.badge)}</span>` : ''}
      ${s.title ? `<h2 style="font-size:1.4rem;font-weight:800;color:#fff;margin:0 0 6px">${escHtml(s.title)}</h2>` : ''}
      ${s.subtitle ? `<p style="font-size:.85rem;color:#94a3b8;margin:0">${escHtml(s.subtitle)}</p>` : ''}
    </div>` : '';

  // Teacher-authored CSS, scoped: bare selectors are prefixed with the section class.
  const scopedCss = (s.customCss || '').trim()
    ? `<style>${scopeCss(s.customCss || '', cls)}</style>`
    : '';
  return `<section class="section reveal ${cls}" id="sec-${escHtml(s.id)}" style="${bgStyle};padding:${pad} 0">
  <div class="container" style="max-width:${maxw}">
    ${header}
    <div class="${cls}__grid" style="display:grid;grid-template-columns:${gridCols};gap:18px;align-items:start;${align === 'center' ? 'text-align:center;justify-items:center' : ''}">
    ${blocksHtml}
    </div>
  </div>
  <style>@media(max-width:640px){.${cls}__grid{grid-template-columns:1fr !important}}a.${cls}__btn:hover{transform:translateY(-2px)}</style>
  ${scopedCss}
</section>`;
}
