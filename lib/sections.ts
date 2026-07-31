// ──────────────────────────────────────────────
//  Custom Section Designer — shared data model,
//  template gallery, and a pure HTML renderer
//  used by the CMS editor, live preview, and the
//  static site build. Teachers can compose any
//  section from blocks in any shape/size.
// ──────────────────────────────────────────────

export type SectionLayout = 'stack' | 'two' | 'three' | 'grid' | 'split' | 'band';
export type BlockType = 'heading' | 'text' | 'image' | 'button' | 'card' | 'stat' | 'list' | 'quote' | 'divider' | 'spacer';

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
    default:
      return '';
  }
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

  return `<section class="section reveal ${cls}" id="sec-${escHtml(s.id)}" style="${bgStyle};padding:${pad} 0">
  <div class="container" style="max-width:${maxw}">
    ${header}
    <div class="${cls}__grid" style="display:grid;grid-template-columns:${gridCols};gap:18px;align-items:start;${align === 'center' ? 'text-align:center;justify-items:center' : ''}">
    ${blocksHtml}
    </div>
  </div>
  <style>@media(max-width:640px){.${cls}__grid{grid-template-columns:1fr !important}}a.${cls}__btn:hover{transform:translateY(-2px)}</style>
</section>`;
}
