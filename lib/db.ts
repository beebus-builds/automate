import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'teacher.db');
const USE_PG = process.env.USE_POSTGRES === 'true' && !!process.env.DATABASE_URL;

function c(sql: string): string {
  return sql
    .replace(/\$(\d+)/g, '?')
    .replace(/\bNOW\(\)/g, "datetime('now')")
    .replace(/\bJSONB\b/g, 'TEXT')
    .replace(/\bTIMESTAMPTZ\b/g, 'TEXT')
    .replace(/\bSERIAL\b/g, 'INTEGER');
}

function pgTable(sql: string): string {
  return sql;
}

// ─── Backend setup ───

interface Pool {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

let pool: Pool;
let backend: 'pg' | 'sqlite';

if (USE_PG) {
  backend = 'pg';
  const { Pool: PgPool } = require('pg') as { Pool: new (config: any) => { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> } };
  const pgPool = new PgPool({ connectionString: process.env.DATABASE_URL });
  pool = { query: (sql, params) => pgPool.query(sql, params).then(r => ({ rows: r.rows })) };

  async function initPgTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, vercel_token TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY CHECK (id = 1), data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS user_content (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS chat_state (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, messages JSONB NOT NULL DEFAULT '[]', step TEXT NOT NULL DEFAULT 'name', data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS pending_calls (id SERIAL PRIMARY KEY, teacher_name TEXT NOT NULL DEFAULT 'Teacher', room_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ringing', answered_by INTEGER REFERENCES users(id) ON DELETE SET NULL, answered_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS media (id SERIAL PRIMARY KEY, filename TEXT NOT NULL, original_name TEXT NOT NULL, size INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS history (id SERIAL PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS visitor_messages (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, text TEXT NOT NULL, sender TEXT DEFAULT 'visitor', created_at TIMESTAMPTZ DEFAULT NOW())`,
    ];
    for (const sql of tables) {
      await pgPool.query(sql);
    }
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  }
  initPgTables().catch((err: any) => console.error('PG init error:', err.message));
} else {
  backend = 'sqlite';
  const Database: new (path: string, options?: any) => any = require('better-sqlite3');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  pool = {
    query(sql: string, params?: any[]) {
      const s = c(sql);
      const stmt = db.prepare(s);
      const isSelect = s.trim().toUpperCase().startsWith('SELECT');
      const hasReturning = s.toUpperCase().includes('RETURNING');
      const safeParams = (params || []).map(p => p instanceof Date ? p.toISOString() : p);
      if (isSelect || hasReturning) {
        return Promise.resolve({ rows: stmt.all(...safeParams) as any[] });
      }
      stmt.run(...safeParams);
      return Promise.resolve({ rows: [] });
    },
  };

  db.exec(c(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      vercel_token TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS user_content (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS chat_state (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      messages TEXT NOT NULL DEFAULT '[]',
      step TEXT NOT NULL DEFAULT 'name',
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS pending_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_name TEXT NOT NULL DEFAULT 'Teacher',
      room_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ringing',
      answered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      answered_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS visitor_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      sender TEXT DEFAULT 'visitor',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `));
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

export { pool, backend };

async function queryJson(sql: string, params?: any[]): Promise<any> {
  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) return null;
  const row = rows[0];
  for (const key of Object.keys(row)) {
    if (typeof row[key] === 'string' && (row[key].startsWith('{') || row[key].startsWith('['))) {
      try { row[key] = JSON.parse(row[key]); } catch {}
    }
  }
  return row;
}

export async function getContent(userId?: number): Promise<any> {
  if (userId) {
    const row = await queryJson('SELECT data FROM user_content WHERE user_id = $1', [userId]);
    if (row) return row.data;
  }
  const row = await queryJson('SELECT data FROM content WHERE id = 1');
  return row ? row.data : {};
}

export async function saveContent(data: any, userId?: number): Promise<void> {
  const json = JSON.stringify(data);
  if (backend === 'pg') {
    if (userId) {
      await pool.query(
        "INSERT INTO user_content (user_id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()",
        [userId, json]
      );
    }
    await pool.query(
      'INSERT INTO content (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1',
      [json]
    );
  } else {
    if (userId) {
      await pool.query(
        "INSERT INTO user_content (user_id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
        [userId, json]
      );
    }
    await pool.query(
      'INSERT INTO content (id, data) VALUES (1, $1) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
      [json]
    );
  }
}

export async function getChatState(userId: number): Promise<any> {
  const row = await queryJson('SELECT messages, step, data FROM chat_state WHERE user_id = $1', [userId]);
  if (!row) return null;
  return {
    messages: row.messages,
    step: row.step,
    data: row.data,
  };
}

export async function saveChatState(userId: number, messages: any, step: string, data: any): Promise<void> {
  const msgsJson = JSON.stringify(messages);
  const dataJson = JSON.stringify(data);
  if (backend === 'pg') {
    await pool.query(
      "INSERT INTO chat_state (user_id, messages, step, data, updated_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (user_id) DO UPDATE SET messages = $2, step = $3, data = $4, updated_at = NOW()",
      [userId, msgsJson, step, dataJson]
    );
  } else {
    await pool.query(
      "INSERT INTO chat_state (user_id, messages, step, data, updated_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT(user_id) DO UPDATE SET messages = excluded.messages, step = excluded.step, data = excluded.data, updated_at = excluded.updated_at",
      [userId, msgsJson, step, dataJson]
    );
  }
}

export async function getMediaList(): Promise<any[]> {
  const { rows } = await pool.query('SELECT * FROM media ORDER BY created_at DESC');
  return rows;
}

export async function addMedia(filename: string, originalName: string, size: number): Promise<any> {
  const { rows } = await pool.query(
    'INSERT INTO media (filename, original_name, size) VALUES ($1, $2, $3) RETURNING *',
    [filename, originalName, size]
  );
  return rows[0];
}

export async function deleteMedia(id: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT filename FROM media WHERE id = $1', [id]);
  if (rows.length === 0) return false;
  const filePath = path.join(process.cwd(), 'public', 'uploads', rows[0].filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await pool.query('DELETE FROM media WHERE id = $1', [id]);
  return true;
}

export async function pushHistory(data: any): Promise<void> {
  await pool.query(
    "DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY id DESC LIMIT 19)"
  );
  await pool.query('INSERT INTO history (data) VALUES ($1)', [JSON.stringify(data)]);
}

export async function getHistory(): Promise<string[]> {
  const { rows } = await pool.query('SELECT data FROM history ORDER BY id ASC');
  return rows.map((r: any) => r.data);
}

export async function popHistory(): Promise<any | null> {
  const { rows: recent } = await pool.query('SELECT id, data FROM history ORDER BY id DESC LIMIT 2');
  if (recent.length < 2) return null;
  await pool.query('DELETE FROM history WHERE id = $1', [recent[0].id]);
  return JSON.parse(recent[1].data);
}

// ─── section renderers with variant support ─────────────────
function renderHero(c: any, e: any, variant: string): string {
  const h = c.hero || {};
  const t = (s: string) => e(s);
  const tagline = t(h.tagline);
  const title = t(h.title);
  const desc = t(h.description);
  const initials = t(h.initials);
  const aboutSection = c.layout?.sections?.find((s: any) => s.type === 'about') ? '#about' : '#contact';
  const scrollTarget = aboutSection === '#about' ? 'about' : 'contact';

  if (variant === 'minimal') {
    return `<section class="hero hero--minimal" id="home">
  <div class="container hero__inner" style="text-align:center;padding:120px 20px 80px">
    <div class="hero__badge" style="display:inline-flex;margin:0 auto 20px"><span class="hero__badge-dot"></span>${tagline}</div>
    <h1 class="hero__title" style="font-size:clamp(2.2rem,6vw,3.5rem);max-width:700px;margin:0 auto 16px">${title}</h1>
    <p class="hero__desc" style="max-width:560px;margin:0 auto 28px;font-size:1.15rem">${desc}</p>
    <div class="hero__actions" style="justify-content:center"><a href="#contact" class="btn btn--primary">Get in Touch</a><a href="${aboutSection}" class="btn btn--outline">Learn More</a></div>
  </div>
</section>`;
  }

  if (variant === 'split') {
    return `<section class="hero hero--split" id="home">
  <div class="hero__bg"><div class="hero__shape hero__shape--1"></div><div class="hero__shape hero__shape--2"></div><div class="hero__shape hero__shape--3"></div></div>
  <div class="container hero__inner" style="display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;padding:100px 0 60px">
    <div class="hero__content" style="text-align:left">
      <div class="hero__badge" style="display:inline-flex;margin-bottom:16px"><span class="hero__badge-dot"></span>${tagline}</div>
      <h1 class="hero__title" style="font-size:clamp(2rem,5vw,3.2rem);line-height:1.15">${title}</h1>
      <p class="hero__desc" style="font-size:1.1rem;margin:16px 0 28px">${desc}</p>
      <div class="hero__actions"><a href="#contact" class="btn btn--primary">Get in Touch</a><a href="${aboutSection}" class="btn btn--outline">Learn More</a></div>
    </div>
    <div class="hero__visual" style="display:flex;justify-content:center;align-items:center">
      <div style="position:relative"><div class="hero__avatar" style="width:220px;height:220px"><span class="hero__avatar-text" style="font-size:3.5rem">${initials}</span></div><div class="hero__ring hero__ring--1" style="width:300px;height:300px"></div><div class="hero__ring hero__ring--2" style="width:380px;height:380px"></div></div>
    </div>
  </div>
  <div class="hero__scroll" onclick="document.getElementById('${scrollTarget}').scrollIntoView({behavior:'smooth'})"><span>Scroll</span><div class="hero__scroll-line"></div></div>
</section>`;
  }

  // default — centered hero with avatar ring
  return `<section class="hero" id="home">
  <div class="hero__bg"><div class="hero__shape hero__shape--1"></div><div class="hero__shape hero__shape--2"></div><div class="hero__shape hero__shape--3"></div></div>
  <div class="container hero__inner">
    <div class="hero__content">
      <div class="hero__badge"><span class="hero__badge-dot"></span>${tagline}</div>
      <h1 class="hero__title">${title}</h1>
      <p class="hero__desc">${desc}</p>
      <div class="hero__actions">
        <a href="#contact" class="btn btn--primary">Get in Touch</a>
        <a href="${aboutSection}" class="btn btn--outline">Learn More</a>
      </div>
    </div>
    <div class="hero__visual">
      <div class="hero__avatar"><span class="hero__avatar-text">${initials}</span></div>
      <div class="hero__ring hero__ring--1"></div>
      <div class="hero__ring hero__ring--2"></div>
    </div>
  </div>
  <div class="hero__scroll" onclick="document.getElementById('${scrollTarget}').scrollIntoView({behavior:'smooth'})"><span>Scroll</span><div class="hero__scroll-line"></div></div>
</section>`;
}

function renderAbout(c: any, e: any, variant: string): string {
  const a = c.about || {};
  const pars = a.paragraphs || [];
  const lead = e(a.lead);
  const p1 = pars[0] ? '<p>' + e(pars[0]) + '</p>' : '';
  const p2 = pars[1] ? '<p>' + e(pars[1]) + '</p>' : '';
  let statsHtml = '';
  (a.stats || []).forEach(function (st: any) {
    statsHtml += '<div class="stat"><span class="stat__number">' + e(st.number) + e(st.suffix || '') + '</span><span class="stat__label">' + e(st.label) + '</span></div>';
  });

  if (variant === 'text-only') {
    return `<section class="section" id="about">
  <div class="container" style="max-width:720px">
    <div class="section__header reveal" style="text-align:center">
      <span class="section__badge">About Me</span>
      <h2 class="section__title">Know the <span class="text-gradient">Educator</span></h2>
      <p class="section__subtitle">A glimpse into my journey, philosophy, and passion for teaching.</p>
    </div>
    <div class="reveal" style="text-align:center;font-size:1.1rem;line-height:1.8">
      <p class="about__lead" style="font-size:1.25rem;margin-bottom:20px">${lead}</p>
      ${p1}${p2}
      ${statsHtml ? '<div class="about__stats" style="justify-content:center;margin-top:32px">' + statsHtml + '</div>' : ''}
    </div>
  </div>
</section>`;
  }

  if (variant === 'photo-right') {
    return `<section class="section" id="about">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">About Me</span>
      <h2 class="section__title">Know the <span class="text-gradient">Educator</span></h2>
      <p class="section__subtitle">A glimpse into my journey, philosophy, and passion for teaching.</p>
    </div>
    <div class="about__grid reveal" style="direction:rtl">
      <div class="about__media" style="direction:ltr">
        <div class="about__frame"><div class="about__placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Photo</span></div></div>
      </div>
      <div class="about__content" style="direction:ltr">
        <p class="about__lead">${lead}</p>
        ${p1}${p2}
        <div class="about__stats">${statsHtml}</div>
      </div>
    </div>
  </div>
</section>`;
  }

  // default — photo left, content right
  return `<section class="section" id="about">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">About Me</span>
      <h2 class="section__title">Know the <span class="text-gradient">Educator</span></h2>
      <p class="section__subtitle">A glimpse into my journey, philosophy, and passion for teaching.</p>
    </div>
    <div class="about__grid reveal">
      <div class="about__media"><div class="about__frame"><div class="about__placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Photo</span></div></div></div>
      <div class="about__content">
        <p class="about__lead">${lead}</p>
        ${p1}${p2}
        <div class="about__stats">${statsHtml}</div>
      </div>
    </div>
  </div>
</section>`;
}

function renderCourses(c: any, e: any, variant: string): string {
  let html = '';
  (c.courses || []).forEach(function (co: any) {
    const icon = e(co.icon);
    const title = e(co.title);
    const desc = e(co.description);
    const level = e(co.level);
    if (variant === 'list') {
      html += '<div class="course-card" style="display:flex;align-items:center;gap:20px;padding:20px 24px"><div class="course-card__icon" style="font-size:2rem;flex-shrink:0">' + icon + '</div><div style="flex:1"><h3 class="course-card__title">' + title + '</h3><p class="course-card__desc">' + desc + '</p></div><span class="course-card__level" style="flex-shrink:0">' + level + '</span></div>';
    } else if (variant === 'compact') {
      html += '<div class="course-card" style="padding:14px 18px"><div class="course-card__icon" style="font-size:1.4rem;width:36px;height:36px">' + icon + '</div><h3 class="course-card__title" style="font-size:.9rem">' + title + '</h3><p class="course-card__desc" style="font-size:.82rem">' + desc + '</p><span class="course-card__level" style="font-size:.72rem">' + level + '</span></div>';
    } else {
      html += '<div class="course-card"><div class="course-card__icon">' + icon + '</div><h3 class="course-card__title">' + title + '</h3><p class="course-card__desc">' + desc + '</p><span class="course-card__level">' + level + '</span></div>';
    }
  });
  const gridClass = variant === 'list' ? 'courses__list' : variant === 'compact' ? 'courses__compact' : 'courses__grid';
  return `<section class="section section--alt" id="courses">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">Courses</span>
      <h2 class="section__title">Subjects I <span class="text-gradient">Teach</span></h2>
      <p class="section__subtitle">A selection of courses I have taught and developed over my teaching career.</p>
    </div>
    <div class="${gridClass}">${html}</div>
  </div>
</section>`;
}

function renderPhilosophy(c: any, e: any, variant: string): string {
  const p = c.philosophy || {};
  let pointsHtml = '';
  (p.points || []).forEach(function (pt: any) {
    pointsHtml += '<div class="philosophy__point"><h3>' + e(pt.title) + '</h3><p>' + e(pt.description) + '</p></div>';
  });

  if (variant === 'cards-only') {
    return `<section class="section" id="philosophy">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">Philosophy</span>
      <h2 class="section__title">My Teaching <span class="text-gradient">Beliefs</span></h2>
      <p class="section__subtitle">The principles that guide every lesson I teach.</p>
    </div>
    <div class="philosophy__grid reveal">${pointsHtml}</div>
  </div>
</section>`;
  }

  if (variant === 'statement') {
    return `<section class="section" id="philosophy" style="text-align:center">
  <div class="container" style="max-width:720px">
    <div class="section__header reveal">
      <span class="section__badge">My Philosophy</span>
      <h2 class="section__title">Teaching <span class="text-gradient">Statement</span></h2>
    </div>
    <div class="reveal" style="font-size:1.15rem;line-height:1.9;color:var(--color-text-secondary)">
      <blockquote style="border-left:3px solid var(--color-primary);padding:20px 24px;margin-bottom:32px;text-align:left;background:var(--color-bg-card);border-radius:var(--radius-md)">
        <p style="font-size:1.1rem;font-style:italic;margin-bottom:8px">${e(p.quote)}</p>
        <cite style="font-size:.9rem">— ${e(p.attribution)}</cite>
      </blockquote>
      ${pointsHtml ? '<div style="text-align:left">' + pointsHtml.replace(/philosophy__point/g, 'philosophy__point" style="text-align:left') + '</div>' : ''}
    </div>
  </div>
</section>`;
  }

  // default — quote + cards
  return `<section class="section" id="philosophy">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">Philosophy</span>
      <h2 class="section__title">My Teaching <span class="text-gradient">Beliefs</span></h2>
      <p class="section__subtitle">The principles that guide every lesson I teach.</p>
    </div>
    <div class="philosophy__content reveal">
      <blockquote class="philosophy__quote">
        <div class="philosophy__quote-mark">"</div>
        <p>${e(p.quote)}</p>
        <cite>${e(p.attribution)}</cite>
      </blockquote>
      <div class="philosophy__grid">${pointsHtml}</div>
    </div>
  </div>
</section>`;
}

function renderAchievements(c: any, e: any, variant: string): string {
  let html = '';
  (c.achievements || []).forEach(function (ach: any) {
    if (variant === 'timeline') {
      html += '<div class="achievement-card" style="position:relative;padding-left:40px;border-left:2px solid var(--color-primary);border-radius:0;background:transparent;margin-bottom:0;box-shadow:none"><span class="achievement-card__year" style="position:absolute;left:-48px;top:4px;background:var(--color-primary);color:#fff;padding:2px 10px;border-radius:var(--radius-sm);font-size:.72rem">' + e(ach.year) + '</span><h3 class="achievement-card__title" style="font-size:1rem">' + e(ach.title) + '</h3><p style="font-size:.85rem;color:var(--color-text-secondary)">' + e(ach.description) + '</p></div>';
    } else {
      html += '<div class="achievement-card"><span class="achievement-card__year">' + e(ach.year) + '</span><h3 class="achievement-card__title">' + e(ach.title) + '</h3><p>' + e(ach.description) + '</p></div>';
    }
  });
  const wrapperClass = variant === 'timeline' ? 'achievements__timeline' : 'achievements__grid';
  return `<section class="section section--alt" id="achievements">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">Achievements</span>
      <h2 class="section__title">Milestones &amp; <span class="text-gradient">Recognition</span></h2>
      <p class="section__subtitle">Awards, certifications, and career highlights I am proud of.</p>
    </div>
    <div class="${wrapperClass}">${html}</div>
  </div>
</section>`;
}

function renderContact(c: any, e: any, variant: string): string {
  const ct = c.contact || {};
  const infoCards = `<div class="contact__info">
    <div class="contact__card"><div class="contact__card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><div><h4 class="contact__card-label">Email</h4><p class="contact__card-value">${e(ct.email)}</p></div></div>
    <div class="contact__card"><div class="contact__card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div><div><h4 class="contact__card-label">Phone</h4><p class="contact__card-value">${e(ct.phone)}</p></div></div>
    <div class="contact__card"><div class="contact__card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div><h4 class="contact__card-label">Location</h4><p class="contact__card-value">${e(ct.location)}</p></div></div>
  </div>`;
  const formHtml = `<form class="contact__form" id="contactForm">
    <h3 class="contact__form-title">Send a Message</h3>
    <div class="form__row"><div class="form__group"><label for="name">Your Name</label><input type="text" id="name" name="name" placeholder="John Doe" required></div><div class="form__group"><label for="email">Your Email</label><input type="email" id="email" name="email" placeholder="john@example.com" required></div></div>
    <div class="form__group"><label for="subject">Subject</label><input type="text" id="subject" name="subject" placeholder="How can I help you?"></div>
    <div class="form__group"><label for="message">Message</label><textarea id="message" name="message" rows="5" placeholder="Write your message here..." required></textarea></div>
    <button type="submit" class="btn btn--primary btn--full">Send Message</button>
  </form>`;

  if (variant === 'centered') {
    return `<section class="section" id="contact">
  <div class="container" style="max-width:600px">
    <div class="section__header reveal" style="text-align:center">
      <span class="section__badge">Contact</span>
      <h2 class="section__title">Let's <span class="text-gradient">Connect</span></h2>
      <p class="section__subtitle">Have a question or want to collaborate? I would love to hear from you.</p>
    </div>
    <div class="reveal">${formHtml}</div>
    <div class="reveal" style="margin-top:24px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap">${infoCards.replace(/contact__card/g, 'contact__card" style="flex:1;min-width:160px')}</div>
  </div>
</section>`;
  }

  if (variant === 'minimal') {
    return `<section class="section" id="contact">
  <div class="container" style="max-width:600px;text-align:center">
    <div class="section__header reveal">
      <span class="section__badge">Contact</span>
      <h2 class="section__title">Let's <span class="text-gradient">Connect</span></h2>
      <p class="section__subtitle">Have a question or want to collaborate? I would love to hear from you.</p>
    </div>
    <div class="reveal" style="display:flex;flex-direction:column;gap:12px;align-items:center;font-size:1.05rem">
      <p>${e(ct.email)}</p>
      <p>${e(ct.phone)}</p>
      <p>${e(ct.location)}</p>
    </div>
  </div>
</section>`;
  }

  // default — split info + form
  return `<section class="section" id="contact">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">Contact</span>
      <h2 class="section__title">Let's <span class="text-gradient">Connect</span></h2>
      <p class="section__subtitle">Have a question or want to collaborate? I would love to hear from you.</p>
    </div>
    <div class="contact__grid reveal">${infoCards}${formHtml}</div>
  </div>
</section>`;
}

function renderCustomSection(s: any, e: any): string {
  // New block-based designer sections
  if (s && Array.isArray(s.blocks)) {
    const { renderSection } = require('./sections');
    return renderSection(s);
  }
  const alt = s.style === 'alt' ? ' section--alt' : '';
  const sectionId = s.id || 'custom';
  return `<section class="section${alt}" id="sec-${e(sectionId)}">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">${e(s.badge || '')}</span>
      <h2 class="section__title">${e(s.title || '')}</h2>
      ${s.subtitle ? '<p class="section__subtitle">' + e(s.subtitle) + '</p>' : ''}
    </div>
    <div class="custom-section__content reveal">${s.content || ''}</div>
  </div>
</section>`;
}

function applySectionBg(sectionHtml: string, cfg: any, e: (s: string) => string): string {
  if (!cfg) return sectionHtml;
  const styles: string[] = [];
  if (cfg.bgColor) styles.push('background-color:' + cfg.bgColor);
  if (cfg.bgPattern && cfg.bgPattern !== 'none') {
    const pats: Record<string, string> = {
      dots: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px) 20px 20px',
      grid: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px) 40px 40px, linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px) 40px 40px',
    };
    if (pats[cfg.bgPattern]) styles.push('background-image:' + pats[cfg.bgPattern]);
  }
  if (cfg.padding) {
    const pads: Record<string, string> = { compact: '48px', normal: '96px', spacious: '140px' };
    styles.push('padding-top:' + (pads[cfg.padding] || cfg.padding));
    styles.push('padding-bottom:' + (pads[cfg.padding] || cfg.padding));
  }
  if (styles.length > 0) {
    const styleAttr = ' style="' + styles.join(';') + '"';
    return sectionHtml.replace('<section', '<section' + styleAttr);
  }
  return sectionHtml;
}

interface SectionConfig {
  type: string;
  id?: string;
  variant?: string;
  bgColor?: string;
  bgPattern?: string;
  padding?: string;
  style?: string;
}

const SECTION_VARIANTS: Record<string, string[]> = {
  hero: ['default', 'minimal', 'split'],
  about: ['default', 'text-only', 'photo-right'],
  courses: ['default', 'list', 'compact'],
  philosophy: ['default', 'cards-only', 'statement'],
  achievements: ['default', 'timeline'],
  contact: ['default', 'centered', 'minimal'],
};

const NAV_LABELS: Record<string, string> = {
  hero: 'Home',
  about: 'About',
  courses: 'Courses',
  philosophy: 'Philosophy',
  achievements: 'Achievements',
  contact: 'Contact',
};

// ─── main build function ────────────────────────────────────

export async function runBuild(data: any, teacherId?: number): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  const distDir = teacherId
    ? path.join(process.cwd(), 'public', '_site', String(teacherId))
    : path.join(process.cwd(), 'public', '_site');

  if (teacherId) {
    // Per-teacher dir: rebuild in place
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true });
    }
  } else if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }

  const cssTpl = fs.readFileSync(path.join(process.cwd(), 'css', 'style.css'), 'utf8');
  const jsSrc = fs.readFileSync(path.join(process.cwd(), 'js', 'script.js'), 'utf8');
  const tpl = fs.readFileSync(path.join(process.cwd(), 'template.html'), 'utf8');
  const themes = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'themes', 'index.json'), 'utf8'));
  const fonts = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'themes', 'fonts.json'), 'utf8'));

  const vis = data.visibility || {};
  const social = data.socialLinks || [];
  const layout = data.layout || {};
  const year = new Date().getFullYear();

  function e(str: string): string {
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

  // Determine section layout — supports both legacy order[] and new sections[]
  const defaultSections: SectionConfig[] = [
    { type: 'hero', variant: 'default' },
    { type: 'about', variant: 'default' },
    { type: 'courses', variant: 'default' },
    { type: 'philosophy', variant: 'default' },
    { type: 'achievements', variant: 'default' },
    { type: 'contact', variant: 'default' },
  ];

  let resolvedSections: SectionConfig[];

  if (Array.isArray(layout.sections) && layout.sections.length > 0) {
    // New format: array of { type, id?, variant?, bgColor?, bgPattern?, padding? }
    resolvedSections = layout.sections;
  } else if (Array.isArray(layout.order) && layout.order.length > 0) {
    // Legacy format: array of section ID strings
    resolvedSections = layout.order.map(function (id: string) {
      const parts = id.split(':');
      const cfg: SectionConfig = { type: parts[0], variant: parts[1] || 'default' };
      return cfg;
    });
  } else {
    resolvedSections = defaultSections;
  }

  // Check visibility (backward compat with visibility flags)
  const isVisible: Record<string, boolean> = {
    hero: true,
    about: vis.showAbout !== false,
    courses: vis.showCourses !== false,
    philosophy: vis.showPhilosophy !== false,
    achievements: vis.showAchievements !== false,
    contact: vis.showContact !== false,
  };

  const customSectionsArr: Record<string, any> = {};
  (data.customSections || []).forEach(function (s: any) {
    customSectionsArr[s.id] = s;
  });

  // Generate sections in order with variant support
  const sectionsHtml: string[] = [];
  const navEntries: { id: string; label: string }[] = [];

  for (const cfg of resolvedSections) {
    const type = cfg.type || '';
    const variant = cfg.variant || 'default';
    const id = cfg.id || type;

    if (type === 'custom') {
      const custom = customSectionsArr[id] || customSectionsArr[cfg.id || ''];
      if (custom) {
        sectionsHtml.push(applySectionBg(renderCustomSection(custom, e), cfg, e));
        if (custom.title) navEntries.push({ id: 'sec-' + id, label: custom.title });
      }
    } else if (type === 'hero' && renderHero) {
      sectionsHtml.push(applySectionBg(renderHero(data, e, variant), cfg, e));
      navEntries.push({ id: 'home', label: 'Home' });
    } else if (type === 'about' && renderAbout) {
      if (isVisible.about === false) continue;
      sectionsHtml.push(applySectionBg(renderAbout(data, e, variant), cfg, e));
      navEntries.push({ id: 'about', label: 'About' });
    } else if (type === 'courses' && renderCourses) {
      if (isVisible.courses === false) continue;
      sectionsHtml.push(applySectionBg(renderCourses(data, e, variant), cfg, e));
      navEntries.push({ id: 'courses', label: 'Courses' });
    } else if (type === 'philosophy' && renderPhilosophy) {
      if (isVisible.philosophy === false) continue;
      sectionsHtml.push(applySectionBg(renderPhilosophy(data, e, variant), cfg, e));
      navEntries.push({ id: 'philosophy', label: 'Philosophy' });
    } else if (type === 'achievements' && renderAchievements) {
      if (isVisible.achievements === false) continue;
      sectionsHtml.push(applySectionBg(renderAchievements(data, e, variant), cfg, e));
      navEntries.push({ id: 'achievements', label: 'Achievements' });
    } else if (type === 'contact' && renderContact) {
      if (isVisible.contact === false) continue;
      sectionsHtml.push(applySectionBg(renderContact(data, e, variant), cfg, e));
      navEntries.push({ id: 'contact', label: 'Contact' });
    }
  }

  // Append any custom sections not referenced in layout
  (data.customSections || []).forEach(function (s: any) {
    const already = resolvedSections.some(function (cfg: SectionConfig) {
      return (cfg.id || cfg.type) === s.id;
    });
    if (!already) {
      sectionsHtml.push(renderCustomSection(s, e));
      if (s.title) navEntries.push({ id: 'sec-' + s.id, label: s.title });
    }
  });

  // Generate navbar links dynamically from resolved order
  let navHtml = '';
  navEntries.forEach(function (entry, i) {
    const active = i === 0 ? ' active' : '';
    navHtml += '<li><a href="#' + entry.id + '" class="navbar__link' + active + '">' + e(entry.label) + '</a></li>';
  });

  // Social links
  let socialHtml = '';
  if (social.length > 0) {
    social.forEach(function (link: any) {
      const icon = link.icon || 'link';
      const icons: Record<string, string> = {
        linkedin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
        twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>',
        github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
        youtube: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98" fill="currentColor"/></svg>',
        instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
      };
      const svg = icons[icon.toLowerCase()] || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
      socialHtml += '<a href="' + e(link.url) + '" aria-label="' + e(link.label || icon) + '" class="footer__social-link" target="_blank" rel="noopener">' + svg + '</a>';
    });
  } else {
    socialHtml =
      '<a href="#" aria-label="LinkedIn" class="footer__social-link"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>' +
      '<a href="#" aria-label="Twitter" class="footer__social-link"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg></a>' +
      '<a href="#" aria-label="GitHub" class="footer__social-link"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg></a>';
  }

  // Basic replacements
  let html = tpl;
  html = html.replace('{{NAV_HTML}}', navHtml);
  html = html.replace('{{SECTIONS_HTML}}', sectionsHtml.join('\n\n'));
  html = html.replace(/{{SITE_TITLE}}/g, e(data.site?.title || data.hero?.initials || ''));
  html = html.replace(/{{INITIALS}}/g, e(data.hero?.initials || ''));
  html = html.replace(/{{YEAR}}/g, String(year));
  html = html.replace('{{SOCIAL_HTML}}', socialHtml);
  html = html.replace('{{CUSTOM_HEAD}}', data.customHead || '');

  const seo = data.seo || {};
  const metaTitle = seo.metaTitle || data.site?.title || '';
  const metaDesc = seo.metaDesc || data.hero?.description || '';
  const ogImage = seo.ogImage || '';
  const gaId = seo.googleAnalytics || '';
  const gaScript = gaId ? '<script async src="https://www.googletagmanager.com/gtag/js?id=' + e(gaId) + '"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + e(gaId) + '");</script>' : '';
  html = html.replace(/{{SEO_TITLE}}/g, e(metaTitle));
  html = html.replace(/{{SEO_DESC}}/g, e(metaDesc));
  html = html.replace(/{{SEO_IMAGE}}/g, e(ogImage));
  html = html.replace('{{GA_SCRIPT}}', gaScript);

  const selectedTheme = themes[data.theme?.name || 'modern'] || themes.modern;
  html = html.replace(/{{PRIMARY_COLOR}}/g, selectedTheme.primary);
  let css = cssTpl;
  css = css.replace(/{{PRIMARY_COLOR}}/g, selectedTheme.primary);
  css = css.replace(/{{PRIMARY_DARK}}/g, darken(selectedTheme.primary));
  css = css.replace(/{{PRIMARY_LIGHT}}/g, rgba(selectedTheme.primary, 0.12));
  css = css.replace(/{{ACCENT_COLOR}}/g, selectedTheme.accent);
  css = css.replace(/{{ACCENT_LIGHT}}/g, rgba(selectedTheme.accent, 0.12));

  const se = data.style || {};
  const sectionStyle = se.sectionStyle || 'bordered';
  const cardStyle = se.cardStyle || 'bordered';
  html = html.replace('class="layout-wide"', 'class="layout-' + (data.theme?.layout || 'wide') + ' sec-' + sectionStyle + ' card-' + cardStyle + '"');

  const fontPair = (fonts as any)[se.fontPair || 'modern-sans'] || (fonts as any)['modern-sans'];
  const rad = ({ sharp: { sm: '2px', md: '4px', lg: '6px', full: '8px' }, rounded: { sm: '8px', md: '12px', lg: '16px', full: '9999px' }, pill: { sm: '24px', md: '32px', lg: '40px', full: '9999px' } } as any)[se.roundness || 'rounded'] || { sm: '8px', md: '12px', lg: '16px', full: '9999px' };
  const shad = ({
    flat: { sm: 'none', md: 'none', lg: 'none', xl: 'none' },
    soft: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)', lg: '0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.04)', xl: '0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04)' },
    elevated: { sm: '0 2px 4px rgba(0,0,0,0.08)', md: '0 8px 16px rgba(0,0,0,0.1)', lg: '0 16px 24px rgba(0,0,0,0.1)', xl: '0 24px 48px rgba(0,0,0,0.12)' },
    deep: { sm: '0 3px 6px rgba(0,0,0,0.12)', md: '0 12px 24px rgba(0,0,0,0.14)', lg: '0 24px 48px rgba(0,0,0,0.16)', xl: '0 40px 80px rgba(0,0,0,0.2)' },
  } as any)[se.shadowDepth || 'soft'] || { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)', lg: '0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.04)', xl: '0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04)' };
  const sectionPad = ({ compact: '48px', normal: '96px', spacious: '140px' } as any)[se.spacing || 'normal'] || '96px';
  const btnRadius = ({ square: '2px', rounded: '12px', pill: '9999px' } as any)[se.buttonStyle || 'rounded'] || '12px';
  const headerPos = se.headerFixed !== false ? 'fixed' : 'relative';
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

  // Background pattern
  const bgPattern = se.bgPattern || 'none';
  if (bgPattern !== 'none') {
    const patterns: Record<string, string> = {
      dots: `background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 20px 20px;`,
      grid: `background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 40px 40px;`,
      waves: `background-image: url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3C/svg%3E"); background-repeat: repeat;`,
      diagonal: `background-image: linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.02) 75%, transparent 75%, transparent); background-size: 30px 30px;`,
    };
    css += `\nbody { ${patterns[bgPattern] || patterns.dots} }`;
  }

  // Card style
  if (cardStyle === 'glass') {
    css += `
.course-card, .achievement-card, .philosophy__point, .contact__card, .stat { background: rgba(255,255,255,0.04) !important; backdrop-filter: blur(12px) !important; border: 1px solid rgba(255,255,255,0.08) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important; }`;
  } else if (cardStyle === 'elevated') {
    css += `
.course-card, .achievement-card, .philosophy__point, .contact__card, .stat { background: #1e293b !important; border: none !important; box-shadow: 0 8px 24px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1) !important; transition: transform 0.2s, box-shadow 0.2s; }
.course-card:hover, .achievement-card:hover, .philosophy__point:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.25) !important; }`;
  } else if (cardStyle === 'flat') {
    css += `
.course-card, .achievement-card, .philosophy__point, .contact__card, .stat { background: transparent !important; border: none !important; box-shadow: none !important; padding-left: 0 !important; padding-right: 0 !important; }`;
  }

  // Section animation
  const secAnim = se.sectionAnimation || 'fadeUp';
  if (secAnim !== 'none') {
    const animCss: Record<string, string> = {
      fadeUp: `.reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }\n.reveal.revealed { opacity: 1; transform: translateY(0); }`,
      slideIn: `.reveal { opacity: 0; transform: translateX(-30px); transition: opacity 0.7s ease, transform 0.7s ease; }\n.reveal.revealed { opacity: 1; transform: translateX(0); }`,
      zoomIn: `.reveal { opacity: 0; transform: scale(0.95); transition: opacity 0.7s ease, transform 0.7s ease; }\n.reveal.revealed { opacity: 1; transform: scale(1); }`,
    };
    css += '\n' + (animCss[secAnim] || animCss.fadeUp);
  } else {
    css += '\n.reveal { opacity: 1 !important; transform: none !important; }';
  }

  // Inject teacher ID and chat widget script
  const siteUrl = teacherId
    ? `/s/${teacherId}`
    : '/site-preview';
  html = html.replace(/{{TEACHER_ID}}/g, teacherId ? String(teacherId) : '0');
  html = html.replace('</body>', `
<div class="chat-widget" id="chatWidget" data-teacher-id="${teacherId || 0}" data-site-url="${siteUrl}">
  <button class="chat-widget__toggle" id="chatToggle" aria-label="Chat">
    <svg class="chat-widget__icon-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <svg class="chat-widget__icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
  <div class="chat-widget__panel" id="chatPanel">
    <div class="chat-widget__header">
      <span class="chat-widget__title">Ask about me</span>
      <div class="chat-widget__header-actions">
        <button class="chat-widget__mode-btn" id="chatModeBtn" title="Toggle admin mode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button class="chat-widget__close-btn" id="chatCloseBtn" title="Close">&times;</button>
      </div>
    </div>
    <div class="chat-widget__messages" id="chatMessages">
      <div class="chat-widget__msg chat-widget__msg--bot">Hi! Ask me anything about this teacher's work and experience.</div>
    </div>
    <div class="chat-widget__input-area">
      <input class="chat-widget__input" id="chatInput" placeholder="Type your question..." />
      <button class="chat-widget__call-btn chat-widget__call-btn--audio" id="audioCallBtn" title="Audio call with AI" aria-label="Audio call">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </button>
      <button class="chat-widget__call-btn chat-widget__call-btn--video" id="videoCallBtn" title="Video call with AI" aria-label="Video call">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      </button>
      <button class="chat-widget__send" id="chatSendBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>
</div>

<!-- Call overlay -->
<div class="chat-call" id="chatCallOverlay">
  <div class="chat-call__backdrop" id="callBackdrop"></div>
  <div class="chat-call__container" id="callContainer">
    <div class="chat-call__video-area" id="callVideoArea">
      <video class="chat-call__user-video" id="userVideo" autoplay muted playsinline></video>
      <div class="chat-call__ai-avatar" id="aiAvatar">
        <div class="chat-call__avatar-ring chat-call__avatar-ring--1"></div>
        <div class="chat-call__avatar-ring chat-call__avatar-ring--2"></div>
        <div class="chat-call__avatar-ring chat-call__avatar-ring--3"></div>
        <div class="chat-call__avatar-face">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
        </div>
        <div class="chat-call__avatar-label">AI Assistant</div>
      </div>
    </div>
    <div class="chat-call__status">
      <div class="chat-call__status-dot" id="callStatusDot"></div>
      <span class="chat-call__status-text" id="callStatusText">Connecting...</span>
      <span class="chat-call__timer" id="callTimer">00:00</span>
    </div>
    <div class="chat-call__transcript" id="callTranscript">
      <div class="chat-call__transcript-msg chat-call__transcript-msg--ai" id="aiTranscript">Speak to ask anything about this teacher.</div>
      <div class="chat-call__transcript-msg chat-call__transcript-msg--user" id="userTranscript"></div>
    </div>
    <div class="chat-call__controls">
      <button class="chat-call__ctrl chat-call__ctrl--mute" id="callMuteBtn" title="Mute">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </button>
      <button class="chat-call__ctrl chat-call__ctrl--end" id="callEndBtn" title="End call">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </button>
      <button class="chat-call__ctrl chat-call__ctrl--video" id="callVideoToggleBtn" title="Toggle video">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      </button>
    </div>
  </div>
</div>
</body>`);

  // Add chat widget CSS
  css += `

/* ===== CHAT WIDGET ===== */
.chat-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.chat-widget__toggle {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 24px rgba(0,0,0,0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  z-index: 2;
}
.chat-widget__toggle:hover { transform: scale(1.08); box-shadow: 0 10px 32px rgba(0,0,0,0.5); }
.chat-widget__icon-close { display: none; }
.chat-widget--open .chat-widget__icon-open { display: none; }
.chat-widget--open .chat-widget__icon-close { display: block; }
.chat-widget__panel {
  position: absolute;
  bottom: 68px;
  right: 0;
  width: 360px;
  max-height: 520px;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  display: none;
  flex-direction: column;
  overflow: hidden;
  animation: chatSlideUp 0.25s ease;
}
@keyframes chatSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.chat-widget--open .chat-widget__panel { display: flex; }
.chat-widget__header {
  padding: 14px 18px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  font-size: 0.9rem;
}
.chat-widget__header-actions { display: flex; gap: 8px; align-items: center; }
.chat-widget__mode-btn, .chat-widget__close-btn {
  background: rgba(255,255,255,0.15);
  border: none; color: #fff; cursor: pointer;
  border-radius: 6px; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; transition: background 0.15s;
}
.chat-widget__mode-btn:hover, .chat-widget__close-btn:hover { background: rgba(255,255,255,0.3); }
.chat-widget__mode-btn--active { background: rgba(255,255,255,0.35) !important; }
.chat-widget__messages {
  flex: 1; padding: 14px; overflow-y: auto;
  min-height: 200px; max-height: 340px;
  display: flex; flex-direction: column; gap: 10px;
}
.chat-widget__msg {
  padding: 10px 14px; border-radius: 12px;
  font-size: 0.85rem; line-height: 1.5;
  max-width: 90%; word-wrap: break-word;
  animation: msgIn 0.2s ease;
}
@keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.chat-widget__msg--bot { background: #1e293b; color: #e2e8f0; align-self: flex-start; border-bottom-left-radius: 4px; }
.chat-widget__msg--user { background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
.chat-widget__msg--typing { background: #1e293b; color: #94a3b8; align-self: flex-start; display: flex; gap: 4px; padding: 12px 18px; }
.chat-widget__msg--typing span { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation: chatTyping 1s infinite; }
.chat-widget__msg--typing span:nth-child(2) { animation-delay: 0.2s; }
.chat-widget__msg--typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes chatTyping { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
.chat-widget__input-area { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.08); }
.chat-widget__input { flex: 1; padding: 10px 14px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 0.85rem; outline: none; }
.chat-widget__input::placeholder { color: #64748b; }
.chat-widget__input:focus { border-color: var(--color-primary); }
.chat-widget__call-btn {
  width: 40px; height: 40px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #94a3b8; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s;
}
.chat-widget__call-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.chat-widget__call-btn--audio:hover { border-color: #34d399; color: #34d399; }
.chat-widget__call-btn--video:hover { border-color: #818cf8; color: #818cf8; }

.chat-widget__send {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity 0.15s;
}
.chat-widget__send:disabled { opacity: 0.4; cursor: not-allowed; }
.chat-widget__admin-badge { font-size: 0.7rem; padding: 2px 8px; background: rgba(255,255,255,0.2); border-radius: 10px; font-weight: 600; }

/* ===== CHAT CALL OVERLAY ===== */
.chat-call {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 99999; display: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.chat-call--active { display: block; }
.chat-call__backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(12px);
}
.chat-call__container {
  position: relative; z-index: 2;
  max-width: 520px; margin: 0 auto;
  display: flex; flex-direction: column;
  height: 100vh; padding: 24px 20px;
}
.chat-call__video-area {
  flex: 1; position: relative;
  border-radius: 20px; overflow: hidden;
  background: #0a0e1a;
  min-height: 300px;
  display: flex; align-items: center; justify-content: center;
}
.chat-call__user-video {
  position: absolute; top: 16px; right: 16px;
  width: 140px; height: 105px;
  border-radius: 12px; object-fit: cover;
  border: 2px solid rgba(255,255,255,0.15);
  background: #1e293b;
  display: none;
}
.chat-call__user-video--active { display: block; }
.chat-call__ai-avatar {
  display: flex; flex-direction: column;
  align-items: center; gap: 16px;
  position: relative;
}
.chat-call__avatar-ring {
  position: absolute; border-radius: 50%;
  border: 2px solid transparent;
  animation: avatarPulse 2.5s ease-in-out infinite;
}
.chat-call__avatar-ring--1 {
  width: 180px; height: 180px;
  border-color: var(--color-primary);
  opacity: 0.3;
}
.chat-call__avatar-ring--2 {
  width: 140px; height: 140px;
  border-color: var(--color-accent);
  opacity: 0.5;
  animation-delay: 0.5s;
}
.chat-call__avatar-ring--3 {
  width: 100px; height: 100px;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb,99,102,241),0.15), rgba(var(--color-accent-rgb,168,85,247),0.15));
  border: none;
  animation-delay: 1s;
}
.chat-call__avatar-face {
  position: relative; z-index: 1;
  width: 80px; height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  box-shadow: 0 0 40px rgba(99,102,241,0.3);
}
@keyframes avatarPulse {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.08); opacity: 0.8; }
}
.chat-call__avatar-face.listening {
  animation: avatarListening 1.5s ease-in-out infinite;
}
@keyframes avatarListening {
  0%, 100% { box-shadow: 0 0 40px rgba(99,102,241,0.3); }
  50% { box-shadow: 0 0 80px rgba(99,102,241,0.6), 0 0 120px rgba(168,85,247,0.3); }
}
.chat-call__avatar-label { font-size: 0.85rem; color: #94a3b8; font-weight: 500; position: relative; z-index: 1; }
.chat-call__status {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 16px 0 12px;
}
.chat-call__status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #34d399;
  animation: dotPulse 1.5s ease-in-out infinite;
}
@keyframes dotPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.chat-call__status-dot--inactive { background: #ef4444; animation: none; }
.chat-call__status-text { font-size: 0.85rem; color: #94a3b8; font-weight: 500; }
.chat-call__timer { font-size: 0.8rem; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
.chat-call__transcript {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 14px 18px;
  min-height: 60px; max-height: 120px;
  overflow-y: auto; margin-bottom: 16px;
}
.chat-call__transcript-msg {
  font-size: 0.85rem; line-height: 1.5;
  animation: msgIn 0.2s ease;
}
.chat-call__transcript-msg--user { color: #e2e8f0; font-weight: 600; margin-bottom: 4px; }
.chat-call__transcript-msg--user::before { content: 'You: '; color: var(--color-primary); font-weight: 700; }
.chat-call__transcript-msg--ai { color: #94a3b8; }
.chat-call__transcript-msg--ai::before { content: 'AI: '; color: var(--color-accent); font-weight: 700; }
.chat-call__controls {
  display: flex; align-items: center;
  justify-content: center; gap: 24px;
  padding: 8px 0 16px;
}
.chat-call__ctrl {
  width: 52px; height: 52px; border-radius: 50%;
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.chat-call__ctrl--end {
  background: #ef4444; color: #fff;
  width: 60px; height: 60px;
  box-shadow: 0 4px 20px rgba(239,68,68,0.4);
}
.chat-call__ctrl--end:hover { background: #dc2626; transform: scale(1.05); }
.chat-call__ctrl--mute, .chat-call__ctrl--video {
  background: rgba(255,255,255,0.08); color: #fff;
}
.chat-call__ctrl--mute:hover, .chat-call__ctrl--video:hover { background: rgba(255,255,255,0.15); }
.chat-call__ctrl--mute.chat-call__ctrl--off { background: rgba(239,68,68,0.2); color: #ef4444; }
.chat-call__ctrl--video.chat-call__ctrl--off { background: rgba(239,68,68,0.2); color: #ef4444; }

@media (max-width: 480px) {
  .chat-widget__panel { width: calc(100vw - 32px); right: -8px; bottom: 64px; }
  .chat-call__container { padding: 16px 12px; }
  .chat-call__video-area { min-height: 240px; border-radius: 14px; }
  .chat-call__user-video { width: 100px; height: 75px; }
  .chat-call__avatar-ring--1 { width: 140px; height: 140px; }
  .chat-call__avatar-ring--2 { width: 110px; height: 110px; }
  .chat-call__avatar-ring--3 { width: 80px; height: 80px; }
  .chat-call__avatar-face { width: 64px; height: 64px; }
  .chat-call__avatar-face svg { width: 32px; height: 32px; }
}`;

  const distDirCss = path.join(distDir, 'css');
  const distDirJs = path.join(distDir, 'js');
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(distDirCss, { recursive: true });
  fs.mkdirSync(distDirJs, { recursive: true });

  fs.writeFileSync(path.join(distDir, 'index.html'), html);
  fs.writeFileSync(path.join(distDirCss, 'style.css'), css);

  // Append chat widget JS to script.js
  const chatJs = `
(function() {
  'use strict';

  // ════════════════════════════════════════════════
  //  DOM refs
  // ════════════════════════════════════════════════
  var teacherId = document.getElementById('chatWidget')?.getAttribute('data-teacher-id') || '0';
  var siteUrl = document.getElementById('chatWidget')?.getAttribute('data-site-url') || '/site-preview';
  var toggle = document.getElementById('chatToggle');
  var panel = document.getElementById('chatPanel');
  var msgsEl = document.getElementById('chatMessages');
  var input = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSendBtn');
  var closeBtn = document.getElementById('chatCloseBtn');
  var modeBtn = document.getElementById('chatModeBtn');
  var widget = document.getElementById('chatWidget');
  var audioCallBtn = document.getElementById('audioCallBtn');
  var videoCallBtn = document.getElementById('videoCallBtn');
  var callOverlay = document.getElementById('chatCallOverlay');
  var callEndBtn = document.getElementById('callEndBtn');
  var callMuteBtn = document.getElementById('callMuteBtn');
  var callVideoToggleBtn = document.getElementById('callVideoToggleBtn');
  var userVideo = document.getElementById('userVideo');
  var aiAvatar = document.getElementById('aiAvatar');
  var aiTranscript = document.getElementById('aiTranscript');
  var userTranscript = document.getElementById('userTranscript');
  var callStatusText = document.getElementById('callStatusText');
  var callTimer = document.getElementById('callTimer');
  var callStatusDot = document.getElementById('callStatusDot');

  // ════════════════════════════════════════════════
  //  State
  // ════════════════════════════════════════════════
  var isAdmin = false;
  var chatOpen = false;
  var inCall = false;
  var callStartTime = null;
  var callTimerInterval = null;
  var isMuted = false;
  var isVideoOn = false;
  var isVideoCall = false;
  var mediaStream = null;
  var signalingWs = null;
  var peerConn = null;
  var currentRoom = null;

  var SIGNAL_URL = 'ws://127.0.0.1:8765/ws/signal';

  if (!toggle) return;

  // ════════════════════════════════════════════════
  //  Auth check
  // ════════════════════════════════════════════════
  fetch('/api/auth', { credentials: 'include' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.user) {
        isAdmin = true;
        if (modeBtn) {
          modeBtn.classList.add('chat-widget__mode-btn--active');
          modeBtn.title = 'Online — receiving calls';
          var badge = document.createElement('span');
          badge.className = 'chat-widget__admin-badge';
          badge.textContent = 'Online';
          document.querySelector('.chat-widget__title')?.appendChild(badge);
        }
        connectSignaling('teacher');
      }
    })
    .catch(function() {});

  // ════════════════════════════════════════════════
  //  Chat panel toggle
  // ════════════════════════════════════════════════
  function toggleChat() {
    chatOpen = !chatOpen;
    widget.classList.toggle('chat-widget--open', chatOpen);
    if (chatOpen) input.focus();
  }

  toggle.addEventListener('click', toggleChat);
  if (closeBtn) closeBtn.addEventListener('click', toggleChat);

  function addMsg(text, role) {
    var div = document.createElement('div');
    div.className = 'chat-widget__msg chat-widget__msg--' + role;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // ════════════════════════════════════════════════
  //  Signaling Server — WebSocket
  // ════════════════════════════════════════════════
  function connectSignaling(role) {
    try {
      signalingWs = new WebSocket(SIGNAL_URL);
    } catch(e) { return; }

    signalingWs.onopen = function() {
      signalingWs.send(JSON.stringify({ type: 'join', role: role }));
    };

    signalingWs.onmessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        handleSignalingMessage(msg);
      } catch(e) {}
    };

    signalingWs.onclose = function() {
      // Reconnect after a delay if admin
      if (isAdmin) setTimeout(function() { connectSignaling('teacher'); }, 3000);
    };
  }

  function handleSignalingMessage(msg) {
    if (msg.type === 'joined') {
      currentRoom = msg.room;
      if (isAdmin) {
        // Teacher is now waiting in a room
        addMsg('You are online. Visitors can call you now.', 'bot');
      }
    }
    else if (msg.type === 'incoming_call') {
      // Teacher receives notification of a visitor wanting to call
      addMsg('A visitor wants to call you! Open the call panel to connect.', 'bot');
      // Auto-answer for now (could add accept/decline UI)
      startWebRTCCall(false);
    }
    else if (msg.type === 'visitor_ready') {
      // Visitor joined the teacher's room — teacher initiates call
      startWebRTCCall(false);
    }
    else if (msg.type === 'offer') {
      if (peerConn) peerConn.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
      peerConn.createAnswer().then(function(answer) {
        peerConn.setLocalDescription(answer);
        if (signalingWs) signalingWs.send(JSON.stringify({ type: 'answer', sdp: answer.sdp, room: currentRoom }));
      });
    }
    else if (msg.type === 'answer') {
      if (peerConn) peerConn.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
    }
    else if (msg.type === 'ice_candidate') {
      if (peerConn && msg.candidate) {
        peerConn.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
    }
    else if (msg.type === 'peer_disconnected') {
      endCall();
      addMsg('The other person left the call.', 'bot');
    }
    else if (msg.type === 'text_message') {
      addMsg(msg.text, 'bot');
      streaming = false;
      sendBtn.disabled = false;
    }
  }

  // ════════════════════════════════════════════════
  //  Text Chat (direct messaging, no AI)
  // ════════════════════════════════════════════════
  var streaming = false;

  function doSend() {
    var text = input.value.trim();
    if (!text || streaming) return;
    input.value = '';
    addMsg(text, 'user');
    streaming = true;
    sendBtn.disabled = true;

    // If connected via signaling, send directly to teacher
    if (signalingWs && signalingWs.readyState === WebSocket.OPEN && currentRoom) {
      signalingWs.send(JSON.stringify({ type: 'text_message', text: text, room: currentRoom }));
      // Expect teacher to reply (no AI auto-reply)
      addMsg('Message sent. Waiting for reply...', 'bot');
      streaming = false;
      sendBtn.disabled = false;
    } else {
      // Teacher offline — store message
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: teacherId, text: text, from: 'visitor' }),
      })
      .then(function() {
        addMsg('Your message has been sent. The teacher will see it when they log in.', 'bot');
        streaming = false;
        sendBtn.disabled = false;
      })
      .catch(function() {
        addMsg('Failed to send. Please try again.', 'bot');
        streaming = false;
        sendBtn.disabled = false;
      });
    }
  }

  if (sendBtn) sendBtn.addEventListener('click', doSend);
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
  }

  // ════════════════════════════════════════════════
  //  Audio / Video Call — WebRTC Peer-to-Peer
  // ════════════════════════════════════════════════
  var ICE_SERVERS = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]};

  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function setCallStatus(text, active) {
    callStatusText.textContent = text;
    callStatusDot.className = 'chat-call__status-dot' + (active ? '' : ' chat-call__status-dot--inactive');
    if (!active) callStatusDot.style.animation = 'none';
    else callStatusDot.style.animation = '';
  }

  function updateTranscript(aiText, userText) {
    if (aiText !== undefined) aiTranscript.textContent = aiText;
    if (userText !== undefined) userTranscript.textContent = userText;
  }

  function startWebRTCCall(video) {
    if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) {
      setCallStatus('Signaling server unavailable', false);
      updateTranscript('', 'Could not connect to signaling server. Make sure the Python server is running.');
      return;
    }

    peerConn = new RTCPeerConnection(ICE_SERVERS);

    peerConn.onicecandidate = function(event) {
      if (event.candidate && signalingWs) {
        signalingWs.send(JSON.stringify({ type: 'ice_candidate', candidate: event.candidate, room: currentRoom }));
      }
    };

    peerConn.ontrack = function(event) {
      // Remote stream — show it
      if (event.streams && event.streams[0]) {
        var remoteAudio = document.createElement('audio');
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.autoplay = true;
        remoteAudio.style.display = 'none';
        document.body.appendChild(remoteAudio);

        if (event.track.kind === 'video') {
          // Show remote video in the main area
          var remoteVideo = document.createElement('video');
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.autoplay = true;
          remoteVideo.playsInline = true;
          remoteVideo.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:20px;';
          var videoArea = document.getElementById('callVideoArea');
          if (videoArea) {
            videoArea.innerHTML = '';
            videoArea.appendChild(remoteVideo);
            // Put user video back on top
            userVideo.classList.add('chat-call__user-video--active');
            videoArea.appendChild(userVideo);
          }
        }
      }
    };

    peerConn.oniceconnectionstatechange = function() {
      if (peerConn.iceConnectionState === 'disconnected' || peerConn.iceConnectionState === 'failed') {
        endCall();
        addMsg('Call disconnected.', 'bot');
      }
    };

    // Add local tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(function(track) {
        peerConn.addTrack(track, mediaStream);
      });
    }

    // If visitor, create offer
    if (!isAdmin) {
      peerConn.createOffer().then(function(offer) {
        peerConn.setLocalDescription(offer);
        if (signalingWs) signalingWs.send(JSON.stringify({ type: 'offer', sdp: offer.sdp, room: currentRoom }));
      });
    }

    callStartTime = Date.now();
    callTimerInterval = setInterval(function() {
      var secs = (Date.now() - callStartTime) / 1000;
      callTimer.textContent = formatTime(secs);
    }, 500);
    setCallStatus('Connected', true);
    updateTranscript('Call connected — talk directly with each other.', '');
  }

  function startCall(video) {
    inCall = true;
    isVideoCall = video;
    isMuted = false;
    isVideoOn = video;
    callOverlay.className = 'chat-call chat-call--active';
    widget.classList.remove('chat-widget--open');
    chatOpen = false;
    updateTranscript('Connecting...', '');
    setCallStatus('Connecting...', true);
    aiAvatar.style.display = 'flex';

    if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) {
      if (isAdmin) {
        // Teacher starts signaling
        connectSignaling('teacher');
        setTimeout(function() { startCall(video); }, 1000);
        return;
      }
      setCallStatus('Teacher is offline', false);
      updateTranscript('', 'The teacher is not available right now. Send them a message instead.');
      inCall = false;
      callOverlay.className = 'chat-call';
      return;
    }

    var constraints = video ? { video: true, audio: true } : { audio: true };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        mediaStream = stream;
        if (video) {
          userVideo.srcObject = stream;
          userVideo.classList.add('chat-call__user-video--active');
          isVideoOn = true;
        }
        startWebRTCCall(video);
      })
      .catch(function() {
        setCallStatus('Microphone access denied', false);
        updateTranscript('', 'Please allow microphone access to call.');
      });
  }

  function endCall() {
    inCall = false;
    isVideoCall = false;
    callOverlay.className = 'chat-call';
    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    if (peerConn) { peerConn.close(); peerConn = null; }
    if (signalingWs && currentRoom) {
      try { signalingWs.send(JSON.stringify({ type: 'end_call', room: currentRoom })); } catch(e) {}
    }
    if (mediaStream) { mediaStream.getTracks().forEach(function(t) { t.stop(); }); mediaStream = null; }
    userVideo.srcObject = null;
    userVideo.classList.remove('chat-call__user-video--active');
    isVideoOn = false;
    // Restore avatar view
    var videoArea = document.getElementById('callVideoArea');
    if (videoArea) {
      videoArea.innerHTML = '';
      videoArea.appendChild(aiAvatar);
      videoArea.appendChild(userVideo);
    }
    aiAvatar.style.display = 'flex';
    // Re-connect signaling if teacher
    if (isAdmin) {
      connectSignaling('teacher');
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (mediaStream) mediaStream.getAudioTracks().forEach(function(t) { t.enabled = !isMuted; });
    callMuteBtn.className = 'chat-call__ctrl chat-call__ctrl--mute' + (isMuted ? ' chat-call__ctrl--off' : '');
  }

  function toggleVideo() {
    if (!isVideoCall) return;
    isVideoOn = !isVideoOn;
    if (mediaStream) mediaStream.getVideoTracks().forEach(function(t) { t.enabled = isVideoOn; });
    userVideo.classList.toggle('chat-call__user-video--active', isVideoOn);
    callVideoToggleBtn.className = 'chat-call__ctrl chat-call__ctrl--video' + (isVideoOn ? '' : ' chat-call__ctrl--off');
  }

  // ── Call event listeners ──
  if (audioCallBtn) audioCallBtn.addEventListener('click', function() { startCall(false); });
  if (videoCallBtn) videoCallBtn.addEventListener('click', function() { startCall(true); });
  if (callEndBtn) callEndBtn.addEventListener('click', endCall);
  if (callMuteBtn) callMuteBtn.addEventListener('click', toggleMute);
  if (callVideoToggleBtn) callVideoToggleBtn.addEventListener('click', toggleVideo);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && inCall) endCall(); });
})();
`;
  fs.writeFileSync(path.join(distDirJs, 'script.js'), jsSrc + '\n' + chatJs);

  return teacherId
    ? 'Site built! Live at /s/' + teacherId
    : 'Site built successfully at /site-preview/';
}
