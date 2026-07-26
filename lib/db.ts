import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data.db');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
  }
  return db;
}

function initTables() {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function getContent(): object {
  const row = getDb().prepare('SELECT data FROM content WHERE id = 1').get() as { data: string } | undefined;
  return row ? JSON.parse(row.data) : {};
}

export function saveContent(data: object): void {
  getDb().prepare('INSERT OR REPLACE INTO content (id, data) VALUES (1, ?)').run(JSON.stringify(data));
}

export function getMediaList(): object[] {
  return getDb().prepare('SELECT * FROM media ORDER BY created_at DESC').all() as object[];
}

export function addMedia(filename: string, originalName: string, size: number): object {
  const info = getDb().prepare('INSERT INTO media (filename, original_name, size) VALUES (?, ?, ?)').run(filename, originalName, size);
  return getDb().prepare('SELECT * FROM media WHERE id = ?').get(info.lastInsertRowid) as object;
}

export function deleteMedia(id: number): boolean {
  const row = getDb().prepare('SELECT filename FROM media WHERE id = ?').get(id) as { filename: string } | undefined;
  if (!row) return false;
  const filePath = path.join(UPLOADS_DIR, row.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  getDb().prepare('DELETE FROM media WHERE id = ?').run(id);
  return true;
}

export function pushHistory(data: object): void {
  const d = getDb();
  d.prepare('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY id DESC LIMIT 19)').run();
  d.prepare('INSERT INTO history (data) VALUES (?)').run(JSON.stringify(data));
}

export function getHistory(): string[] {
  const rows = getDb().prepare('SELECT data FROM history ORDER BY id ASC').all() as { data: string }[];
  return rows.map(r => r.data);
}

export function popHistory(): object | null {
  const d = getDb();
  const rows = d.prepare('SELECT id, data FROM history ORDER BY id DESC LIMIT 2').all() as { id: number; data: string }[];
  if (rows.length < 2) return null;
  d.prepare('DELETE FROM history WHERE id = ?').run(rows[0].id);
  return JSON.parse(rows[1].data);
}

export function runBuild(data: object): string {
  const fs = require('fs');
  const path = require('path');
  const distDir = path.join(process.cwd(), 'public', '_site');

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }

  const cssTpl = fs.readFileSync(path.join(process.cwd(), 'css', 'style.css'), 'utf8');
  const jsSrc = fs.readFileSync(path.join(process.cwd(), 'js', 'script.js'), 'utf8');
  const tpl = fs.readFileSync(path.join(process.cwd(), 'template.html'), 'utf8');
  const themes = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'themes', 'index.json'), 'utf8'));
  const fonts = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'themes', 'fonts.json'), 'utf8'));

  const c = data as any;
  const s = c.site || {};
  const h = c.hero || {};
  const a = c.about || {};
  const p = c.philosophy || {};
  const ct = c.contact || {};
  const year = new Date().getFullYear();

  function escHtml(str: string): string {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function rgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  function darken(hex: string): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  let html = tpl;
  html = html.replace(/{{SITE_TITLE}}/g, escHtml(s.title));
  html = html.replace(/{{HERO_TAGLINE}}/g, escHtml(h.tagline));
  html = html.replace(/{{HERO_TITLE}}/g, escHtml(h.title));
  html = html.replace(/{{HERO_HIGHLIGHT}}/g, escHtml(h.highlight));
  html = html.replace(/{{HERO_DESC}}/g, escHtml(h.description));
  html = html.replace(/{{INITIALS}}/g, escHtml(h.initials));
  html = html.replace(/{{ABOUT_LEAD}}/g, escHtml(a.lead));

  const aboutParagraphs = a.paragraphs || [];
  html = html.replace('{{ABOUT_P1}}', aboutParagraphs[0] ? '<p>' + escHtml(aboutParagraphs[0]) + '</p>' : '');
  html = html.replace('{{ABOUT_P2}}', aboutParagraphs[1] ? '<p>' + escHtml(aboutParagraphs[1]) + '</p>' : '');

  let statsHtml = '';
  (a.stats || []).forEach(function (st: any) {
    statsHtml += '<div class="stat"><span class="stat__number">' + escHtml(st.number) + escHtml(st.suffix) + '</span><span class="stat__label">' + escHtml(st.label) + '</span></div>';
  });
  html = html.replace('{{STATS_HTML}}', statsHtml);

  let coursesHtml = '';
  (c.courses || []).forEach(function (co: any) {
    coursesHtml += '<div class="course-card">' +
      '<div class="course-card__icon">' + escHtml(co.icon) + '</div>' +
      '<h3 class="course-card__title">' + escHtml(co.title) + '</h3>' +
      '<p class="course-card__desc">' + escHtml(co.description) + '</p>' +
      '<span class="course-card__level">' + escHtml(co.level) + '</span></div>';
  });
  html = html.replace('{{COURSES_HTML}}', coursesHtml);

  html = html.replace(/{{PHILOSOPHY_QUOTE}}/g, escHtml(p.quote));
  html = html.replace(/{{PHILOSOPHY_CITE}}/g, escHtml(p.attribution));

  let pointsHtml = '';
  (p.points || []).forEach(function (pt: any) {
    pointsHtml += '<div class="philosophy__point"><h3>' + escHtml(pt.title) + '</h3><p>' + escHtml(pt.description) + '</p></div>';
  });
  html = html.replace('{{PHILOSOPHY_POINTS_HTML}}', pointsHtml);

  let achievementsHtml = '';
  (c.achievements || []).forEach(function (ach: any) {
    achievementsHtml += '<div class="achievement-card">' +
      '<span class="achievement-card__year">' + escHtml(ach.year) + '</span>' +
      '<h3 class="achievement-card__title">' + escHtml(ach.title) + '</h3>' +
      '<p>' + escHtml(ach.description) + '</p></div>';
  });
  html = html.replace('{{ACHIEVEMENTS_HTML}}', achievementsHtml);

  html = html.replace(/{{CONTACT_EMAIL}}/g, escHtml(ct.email));
  html = html.replace(/{{CONTACT_PHONE}}/g, escHtml(ct.phone));
  html = html.replace(/{{CONTACT_LOCATION}}/g, escHtml(ct.location));
  html = html.replace(/{{YEAR}}/g, String(year));

  const seo = c.seo || {};
  const metaTitle = seo.metaTitle || s.title || '';
  const metaDesc = seo.metaDesc || h.description || '';
  const ogImage = seo.ogImage || '';
  const gaId = seo.googleAnalytics || '';
  const gaScript = gaId ? '<script async src="https://www.googletagmanager.com/gtag/js?id=' + escHtml(gaId) + '"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + escHtml(gaId) + '");</script>' : '';
  html = html.replace(/{{SEO_TITLE}}/g, escHtml(metaTitle));
  html = html.replace(/{{SEO_DESC}}/g, escHtml(metaDesc));
  html = html.replace(/{{SEO_IMAGE}}/g, escHtml(ogImage));
  html = html.replace('{{GA_SCRIPT}}', gaScript);

  const selectedTheme = themes[c.theme?.name || 'modern'] || themes.modern;
  let css = cssTpl;
  css = css.replace(/{{PRIMARY_COLOR}}/g, selectedTheme.primary);
  css = css.replace(/{{PRIMARY_DARK}}/g, darken(selectedTheme.primary));
  css = css.replace(/{{PRIMARY_LIGHT}}/g, rgba(selectedTheme.primary, 0.12));
  css = css.replace(/{{ACCENT_COLOR}}/g, selectedTheme.accent);
  css = css.replace(/{{ACCENT_LIGHT}}/g, rgba(selectedTheme.accent, 0.12));

  const styleOpts = c.style || {};
  const sectionStyle = styleOpts.sectionStyle || 'bordered';
  html = html.replace('class="layout-wide"', 'class="layout-' + (c.theme?.layout || 'wide') + ' sec-' + sectionStyle + '"');

  const fontPair = (fonts as any)[styleOpts.fontPair || 'modern-sans'] || (fonts as any)['modern-sans'];
  const rad = ({ sharp: { sm: '2px', md: '4px', lg: '6px', full: '8px' }, rounded: { sm: '8px', md: '12px', lg: '16px', full: '9999px' }, pill: { sm: '24px', md: '32px', lg: '40px', full: '9999px' } } as any)[styleOpts.roundness || 'rounded'] || { sm: '8px', md: '12px', lg: '16px', full: '9999px' };

  const shad = ({
    flat: { sm: 'none', md: 'none', lg: 'none', xl: 'none' },
    soft: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)', lg: '0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.04)', xl: '0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04)' },
    elevated: { sm: '0 2px 4px rgba(0,0,0,0.08)', md: '0 8px 16px rgba(0,0,0,0.1)', lg: '0 16px 24px rgba(0,0,0,0.1)', xl: '0 24px 48px rgba(0,0,0,0.12)' },
    deep: { sm: '0 3px 6px rgba(0,0,0,0.12)', md: '0 12px 24px rgba(0,0,0,0.14)', lg: '0 24px 48px rgba(0,0,0,0.16)', xl: '0 40px 80px rgba(0,0,0,0.2)' },
  } as any)[styleOpts.shadowDepth || 'soft'] || { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)', lg: '0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.04)', xl: '0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04)' };

  const sectionPad = ({ compact: '48px', normal: '96px', spacious: '140px' } as any)[styleOpts.spacing || 'normal'] || '96px';
  const btnRadius = ({ square: '2px', rounded: '12px', pill: '9999px' } as any)[styleOpts.buttonStyle || 'rounded'] || '12px';
  const headerPos = styleOpts.headerFixed !== false ? 'fixed' : 'relative';
  const hasHeaderPad = headerPos === 'fixed' ? 'padding-top: 80px;' : '';
  if (hasHeaderPad) {
    html = html.replace('</head>', '<style>body.website-page { ' + hasHeaderPad + ' }</style></head>');
  }

  css = css.replace(/{{FONT_HEADING}}/g, fontPair.heading);
  css = css.replace(/{{FONT_BODY}}/g, fontPair.body);
  css = css.replace(/{{RADIUS_SM}}/g, rad.sm);
  css = css.replace(/{{RADIUS_MD}}/g, rad.md);
  css = css.replace(/{{RADIUS_LG}}/g, rad.lg);
  css = css.replace(/{{RADIUS_FULL}}/g, rad.full);
  css = css.replace(/{{SHADOW_SM}}/g, shad.sm);
  css = css.replace(/{{SHADOW_MD}}/g, shad.md);
  css = css.replace(/{{SHADOW_LG}}/g, shad.lg);
  css = css.replace(/{{SHADOW_XL}}/g, shad.xl);
  css = css.replace(/{{SECTION_PADDING}}/g, sectionPad);
  css = css.replace(/{{HEADER_BEHAVIOR}}/g, headerPos);
  css = css.replace(/{{BTN_RADIUS}}/g, btnRadius);

  const distDirCss = path.join(distDir, 'css');
  const distDirJs = path.join(distDir, 'js');
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(distDirCss, { recursive: true });
  fs.mkdirSync(distDirJs, { recursive: true });

  fs.writeFileSync(path.join(distDir, 'index.html'), html);
  fs.writeFileSync(path.join(distDirCss, 'style.css'), css);
  fs.writeFileSync(path.join(distDirJs, 'script.js'), jsSrc);

  return 'Site built successfully at /_site/';
}
