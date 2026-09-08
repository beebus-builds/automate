import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const DB_PATH = process.env.TEACHER_DB_PATH || path.join(process.cwd(), 'data', 'teacher.db');
const USE_PG = process.env.USE_POSTGRES === 'true' && !!process.env.DATABASE_URL;

function c(sql: string): string {
  return sql
    .replace(/\$(\d+)/g, '?')
    // Store/compare timestamps as ISO-8601 UTC (e.g. 2026-09-03T12:00:00.000Z)
    // so JS `Date.toISOString()` values compare correctly with SQL NOW().
    // `datetime('now')` returns 'YYYY-MM-DD HH:MM:SS' which does NOT sort
    // correctly against ISO strings containing 'T'.
    .replace(/\bNOW\(\)/g, "strftime('%Y-%m-%dT%H:%M:%fZ','now')")
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
  // Gate every query on init so the first request never races table creation.
  let _resolvePgReady!: () => void;
  const pgReady: Promise<void> = new Promise((res) => { _resolvePgReady = () => res(); });
  pool = {
    query: async (sql, params) => {
      await pgReady;
      const r = await pgPool.query(sql, params);
      return { rows: r.rows };
    },
  };

  async function initPgTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, vercel_token TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY CHECK (id = 1), data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS user_content (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS chat_state (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, messages JSONB NOT NULL DEFAULT '[]', step TEXT NOT NULL DEFAULT 'name', data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS media (id SERIAL PRIMARY KEY, filename TEXT NOT NULL, original_name TEXT NOT NULL, size INTEGER NOT NULL, user_id INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS history (id SERIAL PRIMARY KEY, data JSONB NOT NULL, user_id INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS visitor_messages (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, text TEXT NOT NULL, sender TEXT DEFAULT 'visitor', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS site_views (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, path TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS booking_slots (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, weekday INTEGER NOT NULL, "start" TEXT NOT NULL, "end" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', "date" TEXT NOT NULL DEFAULT '', "time" TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', cover TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS site_domains (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, domain TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS teacher_settings (teacher_id INTEGER PRIMARY KEY, notify_email TEXT NOT NULL DEFAULT '', notify_on_message INTEGER NOT NULL DEFAULT 1, notify_on_booking INTEGER NOT NULL DEFAULT 1, mail_provider TEXT NOT NULL DEFAULT '', mail_from TEXT NOT NULL DEFAULT '', resend_key TEXT NOT NULL DEFAULT '', smtp_host TEXT NOT NULL DEFAULT '', smtp_port INTEGER NOT NULL DEFAULT 587, smtp_user TEXT NOT NULL DEFAULT '', smtp_pass TEXT NOT NULL DEFAULT '')`,
      `CREATE TABLE IF NOT EXISTS post_comments (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, post_slug TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS subscribers (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, email TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS testimonial_submissions (id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '', context TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS rate_limits (rl_key TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 0, window_start TIMESTAMPTZ NOT NULL)`,
    ];
    for (const sql of tables) {
      await pgPool.query(sql);
    }
    await pgPool.query('ALTER TABLE media ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL DEFAULT 0');
    await pgPool.query('ALTER TABLE history ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL DEFAULT 0');
    await pgPool.query('ALTER TABLE visitor_messages ADD COLUMN IF NOT EXISTS read INTEGER NOT NULL DEFAULT 0');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    // Opportunistically purge expired sessions (best-effort).
    try { await pgPool.query("DELETE FROM sessions WHERE expires_at < NOW()"); } catch {}
  }
  initPgTables().then(() => _resolvePgReady()).catch((err: any) => { console.error('PG init error:', err.message); _resolvePgReady(); });
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
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
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
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS chat_state (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      messages TEXT NOT NULL DEFAULT '[]',
      step TEXT NOT NULL DEFAULT 'name',
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      user_id INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  try {
    db.exec(c('ALTER TABLE media ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0'));
  } catch {
    // column already exists on fresh or migrated dbs
  }
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      user_id INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  try {
    db.exec(c('ALTER TABLE history ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0'));
  } catch {
    // column already exists on fresh or migrated dbs
  }
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS visitor_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      sender TEXT DEFAULT 'visitor',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  try {
    db.exec(c('ALTER TABLE visitor_messages ADD COLUMN read INTEGER NOT NULL DEFAULT 0'));
  } catch {
    // column already exists on migrated dbs
  }
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS site_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      path TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS booking_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL DEFAULT '',
      time TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS site_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      domain TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS teacher_settings (
      teacher_id INTEGER PRIMARY KEY,
      notify_email TEXT NOT NULL DEFAULT '',
      notify_on_message INTEGER NOT NULL DEFAULT 1,
      notify_on_booking INTEGER NOT NULL DEFAULT 1,
      mail_provider TEXT NOT NULL DEFAULT '',
      mail_from TEXT NOT NULL DEFAULT '',
      resend_key TEXT NOT NULL DEFAULT '',
      smtp_host TEXT NOT NULL DEFAULT '',
      smtp_port INTEGER NOT NULL DEFAULT 587,
      smtp_user TEXT NOT NULL DEFAULT '',
      smtp_pass TEXT NOT NULL DEFAULT ''
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      post_slug TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS testimonial_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      context TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `));
  db.exec(c(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      rl_key TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0,
      window_start TEXT NOT NULL
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

export async function getContent(userId: number): Promise<any> {
  const row = await queryJson('SELECT data FROM user_content WHERE user_id = $1', [userId]);
  return row ? row.data : {};
}

export async function saveContent(data: any, userId: number): Promise<void> {
  const json = JSON.stringify(data);
  if (backend === 'pg') {
    await pool.query(
      "INSERT INTO user_content (user_id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()",
      [userId, json]
    );
  } else {
    await pool.query(
      "INSERT INTO user_content (user_id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
      [userId, json]
    );
  }
}

export async function getChatState(userId: number): Promise<any> {
  const row = await queryJson('SELECT messages, step, data FROM chat_state WHERE user_id = $1', [userId]);
  if (!row) return null;
  const data = row.data || {};
  const memory = data.__assistantMemory;
  if (memory) delete data.__assistantMemory;
  return {
    messages: row.messages,
    step: row.step,
    data,
    memory,
  };
}

export async function saveChatState(userId: number, messages: any, step: string, data: any, memory?: any): Promise<void> {
  const msgsJson = JSON.stringify(messages);
  const dataJson = JSON.stringify({ ...(data || {}), __assistantMemory: memory || undefined });
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

export async function getMediaList(userId?: number, limit = 100, offset = 0): Promise<any[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 100, 1), 200);
  const safeOffset = Math.max(Math.floor(offset) || 0, 0);
  if (userId) {
    const { rows } = await pool.query(
      'SELECT * FROM media WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, safeLimit, safeOffset]
    );
    return rows;
  }
  const { rows } = await pool.query('SELECT * FROM media ORDER BY created_at DESC LIMIT $1 OFFSET $2', [safeLimit, safeOffset]);
  return rows;
}

export async function addMedia(filename: string, originalName: string, size: number, userId = 0): Promise<any> {
  const { rows } = await pool.query(
    'INSERT INTO media (filename, original_name, size, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [filename, originalName, size, userId]
  );
  return rows[0];
}

export async function deleteMedia(id: number, userId = 0): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT filename FROM media WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (rows.length === 0) return false;
  const filePath = path.join(process.cwd(), 'public', 'uploads', rows[0].filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await pool.query('DELETE FROM media WHERE id = $1 AND user_id = $2', [id, userId]);
  return true;
}

export async function pushHistory(data: any, userId: number): Promise<void> {
  await pool.query(
    "DELETE FROM history WHERE user_id = $1 AND id NOT IN (SELECT id FROM history WHERE user_id = $2 ORDER BY id DESC LIMIT 19)",
    [userId, userId]
  );
  await pool.query('INSERT INTO history (data, user_id) VALUES ($1, $2)', [JSON.stringify(data), userId]);
}

export async function getHistory(userId: number, limit = 20): Promise<string[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 20, 1), 50);
  const { rows } = await pool.query('SELECT data FROM history WHERE user_id = $1 ORDER BY id ASC LIMIT $2', [userId, safeLimit]);
  return rows.map((r: any) => r.data);
}

export async function popHistory(userId: number): Promise<any | null> {
  const { rows: recent } = await pool.query(
    'SELECT id, data FROM history WHERE user_id = $1 ORDER BY id DESC LIMIT 2',
    [userId]
  );
  if (recent.length < 2) return null;
  await pool.query('DELETE FROM history WHERE id = $1', [recent[0].id]);
  return JSON.parse(recent[1].data);
}

export interface HistorySummary {
  siteTitle: string;
  heroTitle: string;
  courses: number;
  achievements: number;
  sizeBytes: number;
}

export interface HistoryEntry {
  id: number;
  created_at: string;
  summary: HistorySummary;
}

/** Lightweight human-readable summary so the list endpoint never ships full snapshots. */
export function summarizeHistoryData(data: any): HistorySummary {
  const d = data && typeof data === 'object' ? data : {};
  let sizeBytes = 0;
  try { sizeBytes = Buffer.byteLength(JSON.stringify(d), 'utf8'); } catch { sizeBytes = 0; }
  return {
    siteTitle: String(d?.site?.title ?? d?.seo?.metaTitle ?? '').slice(0, 120),
    heroTitle: String(d?.hero?.title ?? '').slice(0, 120),
    courses: Array.isArray(d?.courses) ? d.courses.length : 0,
    achievements: Array.isArray(d?.achievements) ? d.achievements.length : 0,
    sizeBytes,
  };
}

function parseHistoryData(raw: unknown): any | null {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** Newest-first version list with summaries (no full snapshot payloads). */
export async function getHistoryEntries(userId: number, limit = 20): Promise<HistoryEntry[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 20, 1), 50);
  const { rows } = await pool.query(
    'SELECT id, data, created_at FROM history WHERE user_id = $1 ORDER BY id DESC LIMIT $2',
    [userId, safeLimit]
  );
  return rows.map((r: any) => ({
    id: Number(r.id),
    created_at: String(r.created_at ?? ''),
    summary: summarizeHistoryData(parseHistoryData(r.data) ?? {}),
  }));
}

/** Mark visitor messages read/unread (best-effort on legacy DBs). */
export async function setMessagesRead(ids: number[], teacherId: number, read: boolean): Promise<void> {
  if (!ids.length) return;
  const clean = ids.filter(n => Number.isInteger(n) && n > 0);
  if (!clean.length) return;
  const placeholders = clean.map((_, i) => `$${i + 2}`).join(',');
  try {
    await pool.query(
      `UPDATE visitor_messages SET read = $1 WHERE teacher_id = $${clean.length + 2} AND id IN (${placeholders})`,
      [read ? 1 : 0, ...clean, teacherId]
    );
  } catch {
    // legacy DB without the read column — non-fatal
  }
}

export async function deleteMessage(id: number, teacherId: number): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT id FROM visitor_messages WHERE id = $1 AND teacher_id = $2',
    [id, teacherId]
  );
  if (!rows.length) return false;
  await pool.query('DELETE FROM visitor_messages WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  return true;
}

// ─── site analytics ───

export async function recordView(teacherId: number, pagePath: string): Promise<void> {
  try {
    await pool.query('INSERT INTO site_views (teacher_id, path) VALUES ($1, $2)', [teacherId, String(pagePath || '').slice(0, 200)]);
  } catch {}
}

export interface ViewStats {
  total: number;
  byPath: { path: string; count: number }[];
  byDay: { day: string; count: number }[];
}

export async function getViewStats(teacherId: number, days = 30): Promise<ViewStats> {
  const safeDays = Math.max(1, Math.min(365, Math.floor(days) || 30));
  const cutoffIso = new Date(Date.now() - safeDays * 86400000).toISOString();
  try {
    if (backend === 'pg') {
      const totalQ = await pool.query('SELECT COUNT(*)::int as c FROM site_views WHERE teacher_id = $1 AND created_at >= $2', [teacherId, cutoffIso]);
      const byPathQ = await pool.query(
        'SELECT path, COUNT(*)::int as c FROM site_views WHERE teacher_id = $1 AND created_at >= $2 GROUP BY path ORDER BY c DESC LIMIT 20',
        [teacherId, cutoffIso]
      );
      const byDayQ = await pool.query(
        "SELECT to_char(created_at, 'YYYY-MM-DD') as day, COUNT(*)::int as c FROM site_views WHERE teacher_id = $1 AND created_at >= $2 GROUP BY day ORDER BY day ASC",
        [teacherId, cutoffIso]
      );
      return {
        total: Number(totalQ.rows[0]?.c || 0),
        byPath: byPathQ.rows.map((r: any) => ({ path: String(r.path || '/'), count: Number(r.c) })),
        byDay: byDayQ.rows.map((r: any) => ({ day: String(r.day), count: Number(r.c) })),
      };
    }
  } catch {}
  // Fallback / SQLite path — still capped, but do grouping in JS as before (smaller fetch with cutoff pushed to SQL)
  const { rows } = await pool.query(
    'SELECT path, created_at FROM site_views WHERE teacher_id = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT 5000',
    [teacherId, cutoffIso]
  );
  const byPath = new Map<string, number>();
  const byDay = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    total++;
    const p = String(r.path || '/') || '/';
    byPath.set(p, (byPath.get(p) || 0) + 1);
    const t = new Date(r.created_at).getTime();
    const day = Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : String(r.created_at).slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }
  return {
    total,
    byPath: [...byPath.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 20),
    byDay: [...byDay.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
  };
}

// ─── public directory ───

export interface DirectoryEntry {
  teacherId: number;
  name: string;
  subject: string;
  photo: string;
  tagline: string;
  updatedAt: string;
}

export async function listPublicSites(limit = 60): Promise<DirectoryEntry[]> {
  const { rows } = await pool.query(
    'SELECT u.id AS teacher_id, u.name AS user_name, uc.data AS data, uc.updated_at AS updated_at FROM users u JOIN user_content uc ON uc.user_id = u.id ORDER BY uc.updated_at DESC LIMIT $1',
    [Math.min(Math.max(limit, 1), 200)]
  );
  const out: DirectoryEntry[] = [];
  for (const r of rows) {
    let d: any = (r as any).data;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch { continue; }
    }
    if (!d || typeof d !== 'object') continue;
    if ((d as any)?.meta?.directoryListed === false) continue;
    if (!(d as any)?.hero?.initials) continue;
    out.push({
      teacherId: Number((r as any).teacher_id),
      name: String((d as any)?.site?.title || (r as any).user_name || 'Teacher').replace(/ — Teacher Portfolio$/, ''),
      subject: String((d as any)?.hero?.tagline || '').replace(/ Portfolio$/, ''),
      photo: String((d as any)?.hero?.heroImage || (d as any)?.hero?.photo || ''),
      tagline: String((d as any)?.hero?.description || (d as any)?.seo?.metaDesc || '').slice(0, 140),
      updatedAt: String((r as any).updated_at ?? ''),
    });
  }
  return out;
}

// ─── bookings ───

export interface BookingSlot {
  id?: number;
  weekday: number;
  start: string;
  end: string;
}

export async function getSlots(teacherId: number): Promise<BookingSlot[]> {
  const { rows } = await pool.query(
    'SELECT id, weekday, "start", "end" FROM booking_slots WHERE teacher_id = $1 ORDER BY weekday ASC, "start" ASC',
    [teacherId]
  );
  return rows.map((r: any) => ({ id: Number(r.id), weekday: Number(r.weekday), start: String(r.start), end: String(r.end) }));
}

export async function saveSlots(teacherId: number, slots: BookingSlot[]): Promise<void> {
  await pool.query('DELETE FROM booking_slots WHERE teacher_id = $1', [teacherId]);
  for (const s of slots) {
    await pool.query('INSERT INTO booking_slots (teacher_id, weekday, "start", "end") VALUES ($1, $2, $3, $4)', [teacherId, s.weekday, s.start, s.end]);
  }
}

export interface Booking {
  id: number;
  teacher_id: number;
  name: string;
  email: string;
  date: string;
  time: string;
  note: string;
  status: string;
  created_at: string;
}

export async function createBooking(b: { teacher_id: number; name: string; email: string; date: string; time: string; note: string }): Promise<Booking> {
  const { rows } = await pool.query(
    'INSERT INTO bookings (teacher_id, name, email, "date", "time", note, status) VALUES ($1, $2, $3, $4, $5, $6, \'pending\') RETURNING *',
    [b.teacher_id, b.name, b.email, b.date, b.time, b.note]
  );
  return rows[0];
}

export async function listBookings(teacherId: number, includeStatuses?: string[]): Promise<Booking[]> {
  if (includeStatuses && includeStatuses.length > 0) {
    const placeholders = includeStatuses.map((_, i) => `$${i + 2}`).join(',');
    const { rows } = await pool.query(
      `SELECT * FROM bookings WHERE teacher_id = $1 AND status IN (${placeholders}) ORDER BY "date" ASC, "time" ASC LIMIT 500`,
      [teacherId, ...includeStatuses]
    );
    return rows;
  }
  const { rows } = await pool.query('SELECT * FROM bookings WHERE teacher_id = $1 ORDER BY "date" ASC, "time" ASC LIMIT 500', [teacherId]);
  return rows;
}

export async function setBookingStatus(id: number, teacherId: number, status: string): Promise<boolean> {
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) return false;
  const { rows } = await pool.query('SELECT id FROM bookings WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('UPDATE bookings SET status = $1 WHERE id = $2 AND teacher_id = $3', [status, id, teacherId]);
  return true;
}

export async function deleteBooking(id: number, teacherId: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT id FROM bookings WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('DELETE FROM bookings WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  return true;
}

// ─── blog posts ───

export interface Post {
  id: number;
  teacher_id: number;
  slug: string;
  title: string;
  body: string;
  cover: string;
  published: number;
  created_at: string;
  updated_at: string;
}

export async function listPosts(teacherId: number, publishedOnly: boolean): Promise<Post[]> {
  const { rows } = publishedOnly
    ? await pool.query('SELECT * FROM posts WHERE teacher_id = $1 AND published = $2 ORDER BY created_at DESC LIMIT 200', [teacherId, 1])
    : await pool.query('SELECT * FROM posts WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 200', [teacherId]);
  return rows.map((r: any) => ({ ...r, published: Number(r.published) ? 1 : 0 }));
}

export async function getPost(teacherId: number, slug: string): Promise<Post | null> {
  const { rows } = await pool.query('SELECT * FROM posts WHERE teacher_id = $1 AND slug = $2 LIMIT 1', [teacherId, slug]);
  if (!rows.length) return null;
  return { ...rows[0], published: Number(rows[0].published) ? 1 : 0 };
}

export async function savePost(p: { id?: number; teacher_id: number; slug: string; title: string; body: string; cover: string; published: number }): Promise<Post> {
  if (p.id) {
    const { rows } = await pool.query('SELECT id FROM posts WHERE id = $1 AND teacher_id = $2', [p.id, p.teacher_id]);
    if (!rows.length) throw new Error('not-found');
    const { rows: out } = await pool.query(
      'UPDATE posts SET slug = $1, title = $2, body = $3, cover = $4, published = $5, updated_at = NOW() WHERE id = $6 AND teacher_id = $7 RETURNING *',
      [p.slug, p.title, p.body, p.cover, p.published ? 1 : 0, p.id, p.teacher_id]
    );
    // SQLite RETURNING on UPDATE returns the row; pg too. Fallback fetch:
    if (out.length) return { ...out[0], published: Number(out[0].published) ? 1 : 0 };
    const again = await getPost(p.teacher_id, p.slug);
    if (!again) throw new Error('not-found');
    return again;
  }
  // Unique slug per teacher
  let slug = p.slug;
  for (let i = 2; ; i++) {
    const existing = await getPost(p.teacher_id, slug);
    if (!existing) break;
    slug = `${p.slug}-${i}`;
    if (i > 50) throw new Error('slug-exhausted');
  }
  const { rows } = await pool.query(
    'INSERT INTO posts (teacher_id, slug, title, body, cover, published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [p.teacher_id, slug, p.title, p.body, p.cover, p.published ? 1 : 0]
  );
  if (rows.length) return { ...rows[0], published: Number(rows[0].published) ? 1 : 0 };
  const created = await getPost(p.teacher_id, slug);
  if (!created) throw new Error('create-failed');
  return created;
}

export async function deletePost(id: number, teacherId: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT id FROM posts WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('DELETE FROM posts WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  return true;
}

// ─── custom domains ───

export interface SiteDomain {
  id: number;
  domain: string;
  verified: number;
  created_at: string;
}

export async function listDomains(teacherId: number): Promise<SiteDomain[]> {
  const { rows } = await pool.query('SELECT id, domain, verified, created_at FROM site_domains WHERE teacher_id = $1 ORDER BY created_at ASC', [teacherId]);
  return rows.map((r: any) => ({ id: Number(r.id), domain: String(r.domain), verified: Number(r.verified) ? 1 : 0, created_at: String(r.created_at ?? '') }));
}

export async function addDomain(teacherId: number, domain: string): Promise<SiteDomain> {
  const existing = await pool.query('SELECT id FROM site_domains WHERE teacher_id = $1 AND domain = $2', [teacherId, domain]);
  if (existing.rows.length) {
    const r = existing.rows[0];
    return { id: Number(r.id), domain, verified: Number(r.verified) ? 1 : 0, created_at: String(r.created_at ?? '') };
  }
  const { rows } = await pool.query('INSERT INTO site_domains (teacher_id, domain, verified) VALUES ($1, $2, 0) RETURNING *', [teacherId, domain]);
  if (rows.length) return { id: Number(rows[0].id), domain, verified: 0, created_at: String(rows[0].created_at ?? '') };
  const again = await pool.query('SELECT id, domain, verified, created_at FROM site_domains WHERE teacher_id = $1 AND domain = $2', [teacherId, domain]);
  const r = again.rows[0];
  return { id: Number(r.id), domain, verified: Number(r.verified) ? 1 : 0, created_at: String(r.created_at ?? '') };
}

export async function setDomainVerified(id: number, teacherId: number, verified: boolean): Promise<void> {
  await pool.query('UPDATE site_domains SET verified = $1 WHERE id = $2 AND teacher_id = $3', [verified ? 1 : 0, id, teacherId]);
}

export async function deleteDomain(id: number, teacherId: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT id FROM site_domains WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('DELETE FROM site_domains WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  return true;
}

// ─── teacher notification settings ───

export interface TeacherSettings {
  notify_email: string;
  notify_on_message: number;
  notify_on_booking: number;
  mail_provider: string;
  mail_from: string;
  resend_key: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}

const SETTINGS_DEFAULTS: TeacherSettings = {
  notify_email: '', notify_on_message: 1, notify_on_booking: 1, mail_provider: '',
  mail_from: '', resend_key: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
};

export async function getTeacherSettings(teacherId: number): Promise<TeacherSettings> {
  const { rows } = await pool.query('SELECT * FROM teacher_settings WHERE teacher_id = $1', [teacherId]);
  if (!rows.length) return { ...SETTINGS_DEFAULTS };
  const r = rows[0];
  return {
    notify_email: String(r.notify_email || ''),
    notify_on_message: Number(r.notify_on_message) ? 1 : 0,
    notify_on_booking: Number(r.notify_on_booking) ? 1 : 0,
    mail_provider: String(r.mail_provider || ''),
    mail_from: String(r.mail_from || ''),
    resend_key: String(r.resend_key || ''),
    smtp_host: String(r.smtp_host || ''),
    smtp_port: Number(r.smtp_port) || 587,
    smtp_user: String(r.smtp_user || ''),
    smtp_pass: String(r.smtp_pass || ''),
  };
}

export async function saveTeacherSettings(teacherId: number, s: Partial<TeacherSettings>): Promise<TeacherSettings> {
  const cur = await getTeacherSettings(teacherId);
  const next: TeacherSettings = {
    notify_email: String(s.notify_email ?? cur.notify_email).slice(0, 160),
    notify_on_message: s.notify_on_message === undefined ? cur.notify_on_message : (s.notify_on_message ? 1 : 0),
    notify_on_booking: s.notify_on_booking === undefined ? cur.notify_on_booking : (s.notify_on_booking ? 1 : 0),
    mail_provider: ['resend', 'smtp', ''].includes(String(s.mail_provider ?? cur.mail_provider)) ? String(s.mail_provider ?? cur.mail_provider) : '',
    mail_from: String(s.mail_from ?? cur.mail_from).slice(0, 160),
    resend_key: String(s.resend_key ?? cur.resend_key).slice(0, 200),
    smtp_host: String(s.smtp_host ?? cur.smtp_host).slice(0, 200),
    smtp_port: Math.min(65535, Math.max(1, Number(s.smtp_port ?? cur.smtp_port) || 587)),
    smtp_user: String(s.smtp_user ?? cur.smtp_user).slice(0, 200),
    smtp_pass: String(s.smtp_pass ?? cur.smtp_pass).slice(0, 300),
  };
  if (backend === 'pg') {
    await pool.query(
      'INSERT INTO teacher_settings (teacher_id, notify_email, notify_on_message, notify_on_booking, mail_provider, mail_from, resend_key, smtp_host, smtp_port, smtp_user, smtp_pass) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (teacher_id) DO UPDATE SET notify_email=$2, notify_on_message=$3, notify_on_booking=$4, mail_provider=$5, mail_from=$6, resend_key=$7, smtp_host=$8, smtp_port=$9, smtp_user=$10, smtp_pass=$11',
      [teacherId, next.notify_email, next.notify_on_message, next.notify_on_booking, next.mail_provider, next.mail_from, next.resend_key, next.smtp_host, next.smtp_port, next.smtp_user, next.smtp_pass]
    );
  } else {
    await pool.query(
      'INSERT INTO teacher_settings (teacher_id, notify_email, notify_on_message, notify_on_booking, mail_provider, mail_from, resend_key, smtp_host, smtp_port, smtp_user, smtp_pass) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(teacher_id) DO UPDATE SET notify_email=excluded.notify_email, notify_on_message=excluded.notify_on_message, notify_on_booking=excluded.notify_on_booking, mail_provider=excluded.mail_provider, mail_from=excluded.mail_from, resend_key=excluded.resend_key, smtp_host=excluded.smtp_host, smtp_port=excluded.smtp_port, smtp_user=excluded.smtp_user, smtp_pass=excluded.smtp_pass',
      [teacherId, next.notify_email, next.notify_on_message, next.notify_on_booking, next.mail_provider, next.mail_from, next.resend_key, next.smtp_host, next.smtp_port, next.smtp_user, next.smtp_pass]
    );
  }
  return next;
}

// ─── blog comments (moderated) ───

export interface PostComment {
  id: number;
  post_slug: string;
  name: string;
  text: string;
  status: string;
  created_at: string;
}

export async function addComment(teacherId: number, slug: string, name: string, text: string): Promise<PostComment> {
  const { rows } = await pool.query(
    "INSERT INTO post_comments (teacher_id, post_slug, name, text, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *",
    [teacherId, slug, name, text]
  );
  if (rows.length) return rows[0];
  const { rows: again } = await pool.query('SELECT * FROM post_comments WHERE teacher_id = $1 AND post_slug = $2 ORDER BY id DESC LIMIT 1', [teacherId, slug]);
  return again[0];
}

export async function listComments(teacherId: number, slug: string | null, approvedOnly: boolean): Promise<PostComment[]> {
  if (slug) {
    const { rows } = approvedOnly
      ? await pool.query("SELECT * FROM post_comments WHERE teacher_id = $1 AND post_slug = $2 AND status = 'approved' ORDER BY created_at ASC LIMIT 200", [teacherId, slug])
      : await pool.query('SELECT * FROM post_comments WHERE teacher_id = $1 AND post_slug = $2 ORDER BY created_at ASC LIMIT 200', [teacherId, slug]);
    return rows;
  }
  const { rows } = approvedOnly
    ? await pool.query("SELECT * FROM post_comments WHERE teacher_id = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 200", [teacherId])
    : await pool.query('SELECT * FROM post_comments WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 200', [teacherId]);
  return rows;
}

export async function setCommentStatus(id: number, teacherId: number, status: string): Promise<boolean> {
  if (!['pending', 'approved'].includes(status)) return false;
  const { rows } = await pool.query('SELECT id FROM post_comments WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('UPDATE post_comments SET status = $1 WHERE id = $2 AND teacher_id = $3', [status, id, teacherId]);
  return true;
}

export async function deleteComment(id: number, teacherId: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT id FROM post_comments WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('DELETE FROM post_comments WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  return true;
}

// ─── newsletter subscribers ───

export async function addSubscriber(teacherId: number, email: string): Promise<{ ok: boolean; duplicate?: boolean }> {
  const existing = await pool.query('SELECT id FROM subscribers WHERE teacher_id = $1 AND email = $2', [teacherId, email.toLowerCase()]);
  if (existing.rows.length) return { ok: true, duplicate: true };
  await pool.query('INSERT INTO subscribers (teacher_id, email) VALUES ($1, $2)', [teacherId, email.toLowerCase()]);
  return { ok: true };
}

export async function listSubscribers(teacherId: number): Promise<{ id: number; email: string; created_at: string }[]> {
  const { rows } = await pool.query('SELECT id, email, created_at FROM subscribers WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 2000', [teacherId]);
  return rows;
}

export async function deleteSubscriber(id: number, teacherId: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT id FROM subscribers WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('DELETE FROM subscribers WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  return true;
}

// ─── testimonial submissions ───

export interface TestimonialSubmission {
  id: number;
  name: string;
  text: string;
  context: string;
  status: string;
  created_at: string;
}

export async function addTestimonial(teacherId: number, name: string, text: string, context: string): Promise<TestimonialSubmission> {
  const { rows } = await pool.query(
    "INSERT INTO testimonial_submissions (teacher_id, name, text, context, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *",
    [teacherId, name, text, context]
  );
  if (rows.length) return rows[0];
  const { rows: again } = await pool.query('SELECT * FROM testimonial_submissions WHERE teacher_id = $1 ORDER BY id DESC LIMIT 1', [teacherId]);
  return again[0];
}

export async function listTestimonials(teacherId: number, approvedOnly: boolean): Promise<TestimonialSubmission[]> {
  const { rows } = approvedOnly
    ? await pool.query("SELECT * FROM testimonial_submissions WHERE teacher_id = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 200", [teacherId])
    : await pool.query('SELECT * FROM testimonial_submissions WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 200', [teacherId]);
  return rows;
}

export async function setTestimonialStatus(id: number, teacherId: number, status: string): Promise<boolean> {
  if (!['pending', 'approved'].includes(status)) return false;
  const { rows } = await pool.query('SELECT id FROM testimonial_submissions WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('UPDATE testimonial_submissions SET status = $1 WHERE id = $2 AND teacher_id = $3', [status, id, teacherId]);
  return true;
}

export async function deleteTestimonial(id: number, teacherId: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT id FROM testimonial_submissions WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  if (!rows.length) return false;
  await pool.query('DELETE FROM testimonial_submissions WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
  return true;
}

/** Full snapshot for a single version (preview + restore). */
export async function getHistoryEntry(id: number, userId: number): Promise<{ id: number; created_at: string; data: any } | null> {
  const { rows } = await pool.query(
    'SELECT id, data, created_at FROM history WHERE id = $1 AND user_id = $2',
    [Math.floor(id), userId]
  );
  if (rows.length === 0) return null;
  const data = parseHistoryData(rows[0].data);
  if (!data) return null;
  return { id: Number(rows[0].id), created_at: String(rows[0].created_at ?? ''), data };
}

// ─── section renderers with variant support ─────────────────
function renderHero(c: any, e: any, variant: string): string {
  const h = c.hero || {};
  const t = (s: string) => e(s);
  const tagline = t(h.tagline);
  const title = t(h.title);
  const desc = t(h.description);
  const initials = t(h.initials);
  // Profile photo collected in chat (heroImage) or Studio — replaces the initials avatar.
  // Strict allowlist: http(s), protocol-relative, root-relative, or data:image only.
  const photoUrl = String(h.heroImage || h.photo || '');
  const photo = /^(https?:\/\/|\/\/|\/)/i.test(photoUrl) || /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(photoUrl) ? e(photoUrl) : '';
  const avatarInner = photo
    ? `<img src="${photo}" alt="${t(h.title || 'Teacher photo')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block" loading="lazy" />`
    : `<span class="hero__avatar-text"${variant === 'split' ? ' style="font-size:3.5rem"' : ''}>${initials}</span>`;
  const avatarStyle = photo ? 'overflow:hidden;' : '';
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
      <div style="position:relative"><div class="hero__avatar" style="width:220px;height:220px;${avatarStyle}">${avatarInner}</div><div class="hero__ring hero__ring--1" style="width:300px;height:300px"></div><div class="hero__ring hero__ring--2" style="width:380px;height:380px"></div></div>
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
      <div class="hero__avatar"${photo ? ' style="overflow:hidden"' : ''}>${avatarInner}</div>
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
  // Sanitize legacy freeform content — escape to prevent stored XSS
  const safeContent = e(String(s.content || '').slice(0, 5000));
  return `<section class="section${alt}" id="sec-${e(sectionId)}">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">${e(s.badge || '')}</span>
      <h2 class="section__title">${e(s.title || '')}</h2>
      ${s.subtitle ? '<p class="section__subtitle">' + e(s.subtitle) + '</p>' : ''}
    </div>
    <div class="custom-section__content reveal">${safeContent}</div>
  </div>
</section>`;
}

function isSafeBgColor(c: string): boolean {
  const s = String(c || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) || /^rgba?\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?(\s*,\s*\d*\.?\d+\s*)?\)$/i.test(s) || /^hsla?\(.+\)$/i.test(s);
}

function applySectionBg(sectionHtml: string, cfg: any, e: (s: string) => string): string {
  if (!cfg) return sectionHtml;
  const styles: string[] = [];
  if (cfg.bgColor && isSafeBgColor(cfg.bgColor)) styles.push('background-color:' + cfg.bgColor);
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

export async function runBuild(data: any, teacherId: number | string): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  const idStr = String(teacherId ?? 'preview');
  if (!/^(?:\d+|preview)$/.test(idStr)) throw new Error('Invalid teacherId');
  const distDir = path.join(process.cwd(), 'public', '_site', idStr);
  const root = path.join(process.cwd(), 'public', '_site');
  const resolved = path.resolve(distDir);
  if (!resolved.startsWith(path.resolve(root) + path.sep) && resolved !== path.resolve(root)) throw new Error('Path traversal');

  if (fs.existsSync(distDir)) {
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

  // ── Multi-page structure: each section type gets its own page ──
  // index.html = hero + overview cards linking to subpages
  // about.html, courses.html, philosophy.html, achievements.html,
  // contact.html = one full section each; custom sections get sec-<id>.html
  const PAGE_FILE: Record<string, string> = {
    hero: 'index.html',
    about: 'about.html',
    courses: 'courses.html',
    philosophy: 'philosophy.html',
    achievements: 'achievements.html',
    contact: 'contact.html',
  };

  const customSectionsArr: Record<string, any> = {};
  (data.customSections || []).forEach(function (s: any) {
    customSectionsArr[s.id] = s;
  });

  // pageFile -> rendered section html chunks
  const pageSections: Record<string, string[]> = {};
  // ordered nav entries: { file, label }
  const navEntries: { file: string; label: string }[] = [];
  const seenNav = new Set<string>();

  function pushNav(file: string, label: string) {
    if (!seenNav.has(file)) {
      seenNav.add(file);
      navEntries.push({ file, label });
    }
  }

  function pushSection(type: string, customId: string, sectionHtml: string, label: string) {
    const file = type === 'custom' ? 'sec-' + customId + '.html' : (PAGE_FILE[type] || 'index.html');
    if (!pageSections[file]) pageSections[file] = [];
    pageSections[file].push(sectionHtml);
    if (label) pushNav(file, label);
  }

  for (const cfg of resolvedSections) {
    const type = cfg.type || '';
    const variant = cfg.variant || 'default';
    const id = cfg.id || type;

    if (type === 'custom') {
      const custom = customSectionsArr[id] || customSectionsArr[cfg.id || ''];
      if (custom) {
        pushSection('custom', id, applySectionBg(renderCustomSection(custom, e), cfg, e), custom.title || 'Page');
      }
    } else if (type === 'hero' && renderHero) {
      pushSection('hero', id, applySectionBg(renderHero(data, e, variant), cfg, e), 'Home');
    } else if (type === 'about' && renderAbout) {
      if (isVisible.about === false) continue;
      pushSection('about', id, applySectionBg(renderAbout(data, e, variant), cfg, e), NAV_LABELS.about);
    } else if (type === 'courses' && renderCourses) {
      if (isVisible.courses === false) continue;
      pushSection('courses', id, applySectionBg(renderCourses(data, e, variant), cfg, e), NAV_LABELS.courses);
    } else if (type === 'philosophy' && renderPhilosophy) {
      if (isVisible.philosophy === false) continue;
      pushSection('philosophy', id, applySectionBg(renderPhilosophy(data, e, variant), cfg, e), NAV_LABELS.philosophy);
    } else if (type === 'achievements' && renderAchievements) {
      if (isVisible.achievements === false) continue;
      pushSection('achievements', id, applySectionBg(renderAchievements(data, e, variant), cfg, e), NAV_LABELS.achievements);
    } else if (type === 'contact' && renderContact) {
      if (isVisible.contact === false) continue;
      pushSection('contact', id, applySectionBg(renderContact(data, e, variant), cfg, e), NAV_LABELS.contact);
    }
  }

  // Append any custom sections not referenced in layout (each its own page)
  (data.customSections || []).forEach(function (s: any) {
    const already = resolvedSections.some(function (cfg: SectionConfig) {
      return (cfg.id || cfg.type) === s.id;
    });
    if (!already) {
      pushSection('custom', s.id, renderCustomSection(s, e), s.title || 'Page');
    }
  });

  // ── Blog: index page + one page per published post ──
  let blogPosts: any[] = [];
  try {
    const res = await pool.query(
      'SELECT slug, title, body, cover, created_at FROM posts WHERE teacher_id = $1 AND published = $2 ORDER BY created_at DESC LIMIT 100',
      [Number(teacherId) || 0, 1]
    );
    blogPosts = res.rows;
  } catch {}
  function safeCover(url: string): string {
    const u = String(url || '');
    return /^(https?:\/\/|\/\/|\/|data:image\/)/i.test(u) ? e(u) : '';
  }
  function postFileName(slug: string): string {
    return 'post-' + String(slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 80) + '.html';
  }
  function postParagraphs(body: string): string {
    return String(body || '')
      .split(/\n{2,}|\r\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => '<p>' + e(p).replace(/\n/g, '<br>') + '</p>')
      .join('\n');
  }
  function readingTime(body: string): number {
    const words = String(body || '').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }
  if (blogPosts.length > 0) {
    const cards = blogPosts.map(function (p: any) {
      const file = postFileName(p.slug);
      const cover = safeCover(p.cover);
      const date = (() => { try { return new Date(p.created_at).toLocaleDateString(); } catch { return ''; } })();
      return '<a href="' + file + '" class="course-card" style="text-decoration:none;color:inherit;display:block">'
        + (cover ? '<img src="' + cover + '" alt="" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:12px;margin-bottom:12px;display:block" />' : '')
        + '<h3 class="course-card__title">' + e(p.title || 'Untitled') + '</h3>'
        + '<p class="course-card__desc">' + e(String(p.body || '').replace(/\s+/g, ' ').slice(0, 140)) + '</p>'
        + '<span class="course-card__level">' + e(date) + ' · ' + readingTime(p.body) + ' min read &rarr;</span></a>';
    }).join('');
    pageSections['blog.html'] = [`<section class="section" id="blog">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">Blog</span>
      <h2 class="section__title">Notes &amp; <span class="text-gradient">Stories</span></h2>
      <p class="section__subtitle">Thoughts from my classroom.</p>
    </div>
    <div class="courses__grid">${cards}</div>
  </div>
</section>`];
    pushNav('blog.html', 'Blog');
    for (const p of blogPosts) {
      const file = postFileName(p.slug);
      const cover = safeCover(p.cover);
      const date = (() => { try { return new Date(p.created_at).toLocaleDateString(); } catch { return ''; } })();
      let approved: any[] = [];
      try {
        const res = await pool.query("SELECT name, text, created_at FROM post_comments WHERE teacher_id = $1 AND post_slug = $2 AND status = 'approved' ORDER BY created_at ASC LIMIT 100", [Number(teacherId) || 0, String(p.slug)]);
        approved = res.rows;
      } catch {}
      const commentsHtml = approved.length
        ? approved.map(function (cm: any) {
            return '<div style="padding:14px 16px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin-bottom:10px;background:rgba(255,255,255,0.02)">'
              + '<strong style="font-size:.82rem;color:#fff">' + e(cm.name || 'Reader') + '</strong>'
              + '<p style="font-size:.85rem;color:#cbd5e1;margin:4px 0 0;line-height:1.6">' + e(cm.text || '') + '</p></div>';
          }).join('')
        : '<p style="font-size:.85rem;color:#64748b">No comments yet — be the first!</p>';
      pageSections[file] = [`<section class="section" id="post">
  <div class="container" style="max-width:720px">
    <a href="blog.html" class="btn btn--outline" style="margin-bottom:20px;display:inline-block">&larr; All posts</a>
    <span class="section__badge reveal">${e(date)} · ${readingTime(p.body)} min read</span>
    <h1 class="section__title reveal" style="text-align:left;margin:12px 0 8px">${e(p.title || 'Untitled')}</h1>
    ${cover ? '<img src="' + cover + '" alt="" loading="lazy" style="width:100%;max-height:360px;object-fit:cover;border-radius:16px;margin:16px 0 8px;display:block" />' : ''}
    <div class="reveal" style="font-size:1rem;line-height:1.8;color:#cbd5e1">${postParagraphs(p.body)}</div>
  </div>
</section>
<section class="section" id="comments" style="padding-top:0">
  <div class="container" style="max-width:720px">
    <h2 class="section__title reveal" style="text-align:left">Comments (${approved.length})</h2>
    <div class="reveal" style="margin:14px 0 20px">${commentsHtml}</div>
    <form data-comment-form data-teacher-id="{{TEACHER_ID}}" data-slug="${e(String(p.slug))}" class="reveal" style="display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px">
      <strong style="color:#fff;font-size:.9rem">Leave a comment</strong>
      <input name="name" required maxlength="60" placeholder="Your name" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none" />
      <textarea name="text" required maxlength="1000" rows="3" placeholder="Thoughts? (held for moderation)" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#fff;font-size:.85rem;outline:none;resize:vertical"></textarea>
      <button type="submit" style="align-self:flex-start;padding:.6rem 1.4rem;border-radius:999px;font-weight:700;font-size:.8rem;color:#fff;border:none;cursor:pointer">Post Comment</button>
      <p data-comment-msg style="font-size:.78rem;margin:0;min-height:1.2em;color:#94a3b8"></p>
    </form>
  </div>
</section>`];
    }
  }

  // Overview cards on the home page linking to every subpage
  function renderOverviewCards(): string {
    const cards = navEntries
      .filter(function (n) { return n.file !== 'index.html'; })
      .map(function (n) {
        return '<a href="' + n.file + '" class="course-card" style="text-decoration:none;color:inherit;display:block">'
          + '<h3 class="course-card__title">' + e(n.label) + '</h3>'
          + '<p class="course-card__desc">Explore my ' + e(n.label.toLowerCase()) + '.</p>'
          + '<span class="course-card__level">Visit page &rarr;</span></a>';
      })
      .join('');
    if (!cards) return '';
    return `<section class="section" id="explore">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">Explore</span>
      <h2 class="section__title">Discover <span class="text-gradient">More</span></h2>
      <p class="section__subtitle">Browse each section of my portfolio.</p>
    </div>
    <div class="courses__grid">${cards}</div>
  </div>
</section>`;
  }

  // ── Homepage-exclusive showcase sections (data-driven) ──
  // Shown on index.html only: hero → highlights → featured → teaser →
  // explore → CTA. Each block renders only when its content exists and
  // the section is visible.
  function renderHomeShowcase(): string[] {
    const out: string[] = [];

    // Stats strip (from About stats)
    const stats = (data.about && data.about.stats) || [];
    if (isVisible.about !== false && stats.length > 0) {
      const statsHtml = stats.map(function (st: any) {
        return '<div class="stat"><span class="stat__number">' + e(st.number) + e(st.suffix || '') + '</span><span class="stat__label">' + e(st.label) + '</span></div>';
      }).join('');
      out.push(`<section class="section home-stats" id="highlights">
  <div class="container">
    <div class="about__stats reveal" style="justify-content:center">${statsHtml}</div>
  </div>
</section>`);
    }

    // Featured courses (first 3)
    const courses = data.courses || [];
    if (isVisible.courses !== false && courses.length > 0) {
      const featured = courses.slice(0, 3).map(function (co: any) {
        return '<div class="course-card"><div class="course-card__icon">' + e(co.icon) + '</div>'
          + '<h3 class="course-card__title">' + e(co.title) + '</h3>'
          + '<p class="course-card__desc">' + e(co.description) + '</p>'
          + '<span class="course-card__level">' + e(co.level) + '</span></div>';
      }).join('');
      out.push(`<section class="section section--alt" id="featured">
  <div class="container">
    <div class="section__header reveal">
      <span class="section__badge">Featured</span>
      <h2 class="section__title">Popular <span class="text-gradient">Courses</span></h2>
      <p class="section__subtitle">A taste of what I teach.</p>
    </div>
    <div class="courses__grid reveal">${featured}</div>
    <div class="home-featured__more reveal"><a href="courses.html" class="btn btn--outline">View all courses</a></div>
  </div>
</section>`);
    }

    // Philosophy quote teaser
    const quote = data.philosophy && data.philosophy.quote;
    if (isVisible.philosophy !== false && quote) {
      out.push(`<section class="section" id="teaser">
  <div class="container" style="max-width:720px">
    <blockquote class="philosophy__quote reveal">
      <div class="philosophy__quote-mark">"</div>
      <p>${e(quote)}</p>
      <cite>${e((data.philosophy || {}).attribution || '')}</cite>
    </blockquote>
    <div class="home-featured__more reveal"><a href="philosophy.html" class="btn btn--outline">My teaching beliefs</a></div>
  </div>
</section>`);
    }

    return out;
  }

  function renderHomeCta(): string {
    if (isVisible.contact === false) return '';
    const name = e(data.site?.title || data.hero?.title || 'me');
    return `<section class="section" id="cta">
  <div class="container" style="max-width:860px">
    <div class="home-cta reveal">
      <h2 class="home-cta__title">Let's work together</h2>
      <p class="home-cta__desc">Have a question for ${name} about classes, collaboration, or tutoring? I would love to hear from you.</p>
      <div class="hero__actions" style="justify-content:center"><a href="contact.html" class="btn btn--primary">Get in Touch</a></div>
    </div>
  </div>
</section>`;
  }

  // Generate navbar links (page links, not anchors)
  function navHtmlFor(activeFile: string): string {
    return navEntries.map(function (entry) {
      const active = entry.file === activeFile ? ' active' : '';
      return '<li><a href="' + entry.file + '" class="navbar__link' + active + '">' + e(entry.label) + '</a></li>';
    }).join('');
  }

  // Rewrite in-page anchors to cross-page links (hero CTAs, etc.)
  function relinkAnchors(pageHtml: string): string {
    const map: Record<string, string> = {
      '#home': 'index.html',
      '#about': 'about.html',
      '#courses': 'courses.html',
      '#philosophy': 'philosophy.html',
      '#achievements': 'achievements.html',
      '#contact': 'contact.html',
      '#blog': 'blog.html',
    };
    let out = pageHtml;
    for (const [anchor, file] of Object.entries(map)) {
      out = out.split('href="' + anchor + '"').join('href="' + file + '"');
    }
    // Custom-section anchors -> their pages
    out = out.replace(/href="#sec-([A-Za-z0-9_-]+)"/g, 'href="sec-$1.html"');
    // Hero scroll button scrolled to a section that now lives on another
    // page — navigate there instead of a no-op scroll.
    out = out.replace(/document\.getElementById\('([A-Za-z0-9_-]+)'\)\.scrollIntoView\(\{behavior:'smooth'\}\)/g,
      function (_m, target) {
        const file = (map as any)['#' + target];
        if (file) return "window.location.href='" + file + "'";
        if (String(target).startsWith('sec-')) return "window.location.href='" + target + ".html'";
        return "document.getElementById('" + target + "')&&document.getElementById('" + target + "').scrollIntoView({behavior:'smooth'})";
      });
    return out;
  }

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

  // ── Shared per-page template filler (multi-page) ──
  const siteTitle = e(data.site?.title || data.hero?.initials || '');
  const siteInitials = e(data.hero?.initials || '');
  const seo = data.seo || {};
  const metaTitleBase = seo.metaTitle || data.site?.title || '';
  const metaDesc = seo.metaDesc || data.hero?.description || '';
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const ogImage = seo.ogImage || (siteBase ? siteBase + '/api/og?teacherId=' + teacherId : '');
  const gaId = seo.googleAnalytics || '';
  const gaScript = gaId ? '<script async src="https://www.googletagmanager.com/gtag/js?id=' + e(gaId) + '"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + e(gaId) + '");</script>' : '';
  const themeLayout = typeof data.theme?.layout === 'string' ? data.theme.layout : (data.theme?.layout?.style || 'wide');
  const layoutClass = 'class="layout-' + e(String(themeLayout)) + ' sec-' + e(String(se_sectionStyle())) + ' card-' + e(String(se_cardStyle())) + '"';
  function se_sectionStyle() { return (data.style || {}).sectionStyle || 'bordered'; }
  function se_cardStyle() { return (data.style || {}).cardStyle || 'bordered'; }

  function pageTitleFor(pageFile: string): string {
    const entry = navEntries.find(function (n) { return n.file === pageFile; });
    if (!entry || pageFile === 'index.html') return metaTitleBase;
    return metaTitleBase ? metaTitleBase + ' | ' + entry.label : entry.label;
  }

  function buildPageHtml(pageFile: string): string {
    const isHome = pageFile === 'index.html';
    const chunks = [...(pageSections[pageFile] || [])];
    if (isHome) {
      // Homepage flow: hero → highlights → featured → teaser → explore → CTA
      chunks.push(...renderHomeShowcase());
      const overview = renderOverviewCards();
      if (overview) chunks.push(overview);
      const cta = renderHomeCta();
      if (cta) chunks.push(cta);
    }
    function sanitizeCustomHeadDb(head: unknown): string {
      const s = String(head || '').trim();
      if (!s) return '';
      const allowed = s.match(/<(meta|link)\b[^>]*>/gi);
      if (!allowed) return '';
      return allowed
        .map(tag => tag.replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, ''))
        .join('\n')
        .slice(0, 2000);
    }
    let page = tpl;
    page = page.replace('{{NAV_HTML}}', navHtmlFor(pageFile));
    page = page.replace('{{SECTIONS_HTML}}', chunks.join('\n\n'));
    page = page.replace(/{{SITE_TITLE}}/g, siteTitle);
    page = page.replace(/{{INITIALS}}/g, siteInitials);
    page = page.replace(/{{YEAR}}/g, String(year));
    page = page.replace('{{SOCIAL_HTML}}', socialHtml);
    page = page.replace('{{CUSTOM_HEAD}}', sanitizeCustomHeadDb(data.customHead || ''));
    page = page.replace(/{{SEO_TITLE}}/g, e(pageTitleFor(pageFile)));
    page = page.replace(/{{SEO_DESC}}/g, e(metaDesc));
    page = page.replace(/{{SEO_IMAGE}}/g, e(ogImage));
    page = page.replace('{{GA_SCRIPT}}', gaScript);
    page = page.replace(/{{PRIMARY_COLOR}}/g, selectedThemePrimary());
    page = page.replace('class="layout-wide"', layoutClass);
    page = page.replace(/{{TEACHER_ID}}/g, String(teacherId));
    if (headerPadStyle()) {
      page = page.replace('</head>', '<style>body.website-page { ' + headerPadStyle() + ' }</style></head>');
    }
    return relinkAnchors(page);
  }

  const selectedTheme = themes[data.theme?.name || 'modern'] || themes.modern;
  function selectedThemePrimary() { return selectedTheme.primary; }
  function headerPadStyle() {
    const se2 = data.style || {};
    const headerPos2 = se2.headerFixed !== false ? 'fixed' : 'relative';
    return headerPos2 === 'fixed' ? 'padding-top: 80px;' : '';
  }
  let css = cssTpl;
  css = css.replace(/{{PRIMARY_COLOR}}/g, selectedTheme.primary);
  css = css.replace(/{{PRIMARY_DARK}}/g, darken(selectedTheme.primary));
  css = css.replace(/{{PRIMARY_LIGHT}}/g, rgba(selectedTheme.primary, 0.12));
  css = css.replace(/{{ACCENT_COLOR}}/g, selectedTheme.accent);
  css = css.replace(/{{ACCENT_LIGHT}}/g, rgba(selectedTheme.accent, 0.12));

  const se = data.style || {};
  const sectionStyle = se.sectionStyle || 'bordered';
  const cardStyle = se.cardStyle || 'bordered';

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

  // Chat widget markup injected into every page before </body>
  const siteUrl = `/s/${teacherId}`;
  const chatWidgetHtml = `
<div class="chat-widget" id="chatWidget" data-teacher-id="${teacherId}" data-site-url="${siteUrl}">
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
      <button class="chat-widget__send" id="chatSendBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>
</div>
`;

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

@media (max-width: 480px) {
  .chat-widget__panel { width: calc(100vw - 32px); right: -8px; bottom: 64px; }
}`;
  const distDirCss = path.join(distDir, 'css');
  const distDirJs = path.join(distDir, 'js');
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(distDirCss, { recursive: true });
  fs.mkdirSync(distDirJs, { recursive: true });

  // ── Write one HTML file per page ──
  // Ensure the home page always exists (hero + overview cards).
  if (!pageSections['index.html']) pageSections['index.html'] = [];
  const pageFiles = Object.keys(pageSections).sort(function (a, b) {
    if (a === 'index.html') return -1;
    if (b === 'index.html') return 1;
    return a.localeCompare(b);
  });
  // Nav order first, then any leftovers (keeps navbar order == file order)
  const orderedPageFiles = navEntries.map(function (n) { return n.file; })
    .filter(function (f, i, arr) { return arr.indexOf(f) === i && pageSections[f]; });
  pageFiles.forEach(function (f) {
    if (orderedPageFiles.indexOf(f) === -1) orderedPageFiles.push(f);
  });
  orderedPageFiles.forEach(function (pageFile) {
    let pageHtml = buildPageHtml(pageFile);
    if (blogPosts.length > 0 && (pageFile === 'blog.html' || pageFile.startsWith('post-'))) {
      pageHtml = pageHtml.replace('</head>', '<link rel="alternate" type="application/rss+xml" title="Blog feed" href="feed.xml" /></head>');
    }
    pageHtml = pageHtml.replace('</body>', chatWidgetHtml + '\n</body>');
    fs.writeFileSync(path.join(distDir, pageFile), pageHtml);
  });

  // ── Per-site sitemap.xml + blog RSS feed ──
  try {
    const pageBase = siteBase ? siteBase + '/s/' + teacherId + '/' : '';
    const xmlEsc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sitemapUrls = orderedPageFiles.map(f => `  <url><loc>${xmlEsc(pageBase + f)}</loc></url>`).join('\n');
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>`);
    if (blogPosts.length > 0) {
      const items = blogPosts.map(function (p: any) {
        const link = pageBase + postFileName(p.slug);
        let pubDate = '';
        try { pubDate = new Date(p.created_at).toUTCString(); } catch {}
        return `  <item>\n    <title>${xmlEsc(p.title || 'Untitled')}</title>\n    <link>${xmlEsc(link)}</link>\n    <guid>${xmlEsc(link)}</guid>`
          + (pubDate ? `\n    <pubDate>${pubDate}</pubDate>` : '')
          + `\n    <description>${xmlEsc(String(p.body || '').replace(/\s+/g, ' ').slice(0, 300))}</description>\n  </item>`;
      }).join('\n');
      fs.writeFileSync(path.join(distDir, 'feed.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>${xmlEsc(metaTitleBase || 'Blog')}</title>\n  <link>${xmlEsc(pageBase + 'blog.html')}</link>\n  <description>${xmlEsc(metaDesc)}</description>\n${items}\n</channel>\n</rss>`);
    }
  } catch {}
  fs.writeFileSync(path.join(distDirCss, 'style.css'), css);

  // Append chat widget JS to script.js (text messaging only)
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

  // ════════════════════════════════════════════════
  //  State
  // ════════════════════════════════════════════════
  var isAdmin = false;
  var chatOpen = false;

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
          modeBtn.title = 'Online';
          var badge = document.createElement('span');
          badge.className = 'chat-widget__admin-badge';
          badge.textContent = 'Online';
          document.querySelector('.chat-widget__title')?.appendChild(badge);
        }
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
  //  Text Chat (AI answer first, falls back to messaging)
  // ════════════════════════════════════════════════
  var streaming = false;
  var AI_REPLIES = ${data.meta?.aiReplies === false ? 'false' : 'true'};

  function storeMessage(text, done) {
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: teacherId, text: text, from: 'visitor' }),
    })
    .then(function() {
      addMsg('Your message has been sent. The teacher will see it when they log in.', 'bot');
      if (done) done();
    })
    .catch(function() {
      addMsg('Failed to send. Please try again.', 'bot');
      if (done) done();
    });
  }

  function finishSend() {
    streaming = false;
    sendBtn.disabled = false;
  }

  function doSend() {
    var text = input.value.trim();
    if (!text || streaming) return;
    input.value = '';
    addMsg(text, 'user');
    streaming = true;
    sendBtn.disabled = true;

    // Try the AI first — it answers from the teacher's own content.
    // If it can't (or is off), store the message for the teacher instead.
    if (!AI_REPLIES) {
      storeMessage(text, finishSend);
      return;
    }
    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: teacherId, question: text }),
    })
    .then(function(r) { return r.json().catch(function() { return {}; }); })
    .then(function(a) {
      if (a && a.ok && a.answer) {
        addMsg(a.answer, 'bot');
        var row = document.createElement('div');
        row.className = 'chat-widget__msg chat-widget__msg--bot';
        var btn = document.createElement('button');
        btn.textContent = 'Still send this to the teacher →';
        btn.style.cssText = 'margin-top:6px;font-size:.75rem;font-weight:700;color:#a5b4fc;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.4);border-radius:8px;padding:6px 10px;cursor:pointer;';
        btn.addEventListener('click', function() {
          btn.disabled = true;
          storeMessage(text, function() {});
        });
        row.appendChild(btn);
        msgsEl.appendChild(row);
        msgsEl.scrollTop = msgsEl.scrollHeight;
        finishSend();
      } else {
        storeMessage(text, finishSend);
      }
    })
    .catch(function() {
      storeMessage(text, finishSend);
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', doSend);
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
  }

  // ════════════════════════════════════════════════
  //  Booking forms (office-hours widgets)
  // ════════════════════════════════════════════════
  document.querySelectorAll('form[data-booking-form]').forEach(function(form) {
    var f = form as HTMLFormElement;
    var tid = f.getAttribute('data-teacher-id') || teacherId;
    var dateInput = f.querySelector('input[name="date"]') as HTMLInputElement | null;
    var timeSel = f.querySelector('select[name="time"]') as HTMLSelectElement | null;
    var nameInput = f.querySelector('input[name="name"]') as HTMLInputElement | null;
    var emailInput = f.querySelector('input[name="email"]') as HTMLInputElement | null;
    var noteInput = f.querySelector('textarea[name="note"]') as HTMLTextAreaElement | null;
    var msg = f.querySelector('[data-booking-msg]') as HTMLElement | null;
    var submitBtn = f.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (!dateInput || !timeSel) return;
    var avail: { slots: any[]; taken: any[] } | null = null;
    function say(t: string, ok?: boolean) {
      if (msg) { msg.textContent = t; msg.style.color = ok ? '#34d399' : '#f87171'; }
    }
    try { dateInput.min = new Date().toISOString().slice(0, 10); } catch (e) {}
    fetch('/api/bookings?teacherId=' + encodeURIComponent(tid))
      .then(function(r) { return r.json(); })
      .then(function(d) {
        avail = d;
        if (!d.slots || !d.slots.length) {
          say('Bookings are not open right now — send a message instead.');
          if (submitBtn) submitBtn.disabled = true;
        }
      })
      .catch(function() {});
    function freeTimes(dateStr: string): string[] {
      if (!avail || !dateStr) return [];
      var wd = new Date(dateStr + 'T12:00:00Z').getUTCDay();
      var taken: Record<string, boolean> = {};
      (avail.taken || []).forEach(function(b: any) { if (b.date === dateStr) taken[b.time] = true; });
      var out: string[] = [];
      (avail.slots || []).forEach(function(s: any) {
        if (s.weekday !== wd) return;
        function mins(x: string) { var p = x.split(':'); return (+p[0]) * 60 + (+p[1]); }
        var cur = mins(s.start), end = mins(s.end);
        while (cur + 30 <= end) {
          var label = String(Math.floor(cur / 60)).padStart(2, '0') + ':' + String(cur % 60).padStart(2, '0');
          if (!taken[label]) out.push(label);
          cur += 30;
        }
      });
      return out.sort();
    }
    dateInput.addEventListener('change', function() {
      timeSel!.innerHTML = '<option value="">Time…</option>';
      var times = freeTimes(dateInput!.value);
      times.forEach(function(t) {
        var o = document.createElement('option');
        o.value = t; o.textContent = t;
        timeSel!.appendChild(o);
      });
      if (!times.length) say('No free times that day — try another date.');
      else if (msg) msg.textContent = '';
    });
    f.addEventListener('submit', function(ev) {
      ev.preventDefault();
      if (submitBtn) submitBtn.disabled = true;
      say('Sending request…');
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: tid,
          name: nameInput ? nameInput.value : '',
          email: emailInput ? emailInput.value : '',
          date: dateInput!.value,
          time: timeSel!.value,
          note: noteInput ? noteInput.value : '',
        }),
      })
        .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j }; }); })
        .then(function(res) {
          if (res.ok) { say('Request sent! The teacher will confirm by email.', true); f.reset(); }
          else { say((res.j && res.j.error) || 'Booking failed.'); }
          if (submitBtn) submitBtn.disabled = false;
        })
        .catch(function() { say('Network error — try again.'); if (submitBtn) submitBtn.disabled = false; });
    });
  });

  // ════════════════════════════════════════════════
  //  Newsletter subscribe forms
  // ════════════════════════════════════════════════
  document.querySelectorAll('form[data-newsletter-form]').forEach(function(form) {
    var f = form as HTMLFormElement;
    var tid = f.getAttribute('data-teacher-id') || teacherId;
    var emailInput = f.querySelector('input[name="email"]') as HTMLInputElement | null;
    var msg = f.querySelector('[data-newsletter-msg]') as HTMLElement | null;
    var btn = f.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (!emailInput) return;
    f.addEventListener('submit', function(ev) {
      ev.preventDefault();
      if (btn) btn.disabled = true;
      if (msg) { msg.textContent = 'Subscribing…'; msg.style.color = '#94a3b8'; }
      fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: tid, email: emailInput!.value }),
      })
        .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j }; }); })
        .then(function(res) {
          if (res.ok) {
            if (msg) { msg.textContent = res.j.duplicate ? 'You are already subscribed. 🎉' : 'Subscribed! Welcome aboard. 🎉'; msg.style.color = '#34d399'; }
            f.reset();
          } else if (msg) {
            msg.textContent = (res.j && res.j.error) || 'Subscribe failed.';
            msg.style.color = '#f87171';
          }
          if (btn) btn.disabled = false;
        })
        .catch(function() {
          if (msg) { msg.textContent = 'Network error — try again.'; msg.style.color = '#f87171'; }
          if (btn) btn.disabled = false;
        });
    });
  });

  // ════════════════════════════════════════════════
  //  Blog comment forms (held for moderation)
  // ════════════════════════════════════════════════
  document.querySelectorAll('form[data-comment-form]').forEach(function(form) {
    var f = form as HTMLFormElement;
    var tid = f.getAttribute('data-teacher-id') || teacherId;
    var slug = f.getAttribute('data-slug') || '';
    var nameInput = f.querySelector('input[name="name"]') as HTMLInputElement | null;
    var textInput = f.querySelector('textarea[name="text"]') as HTMLTextAreaElement | null;
    var msg = f.querySelector('[data-comment-msg]') as HTMLElement | null;
    var btn = f.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (!nameInput || !textInput) return;
    f.addEventListener('submit', function(ev) {
      ev.preventDefault();
      if (btn) btn.disabled = true;
      if (msg) { msg.textContent = 'Posting…'; msg.style.color = '#94a3b8'; }
      fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: tid, slug: slug, name: nameInput!.value, text: textInput!.value }),
      })
        .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j }; }); })
        .then(function(res) {
          if (res.ok) {
            if (msg) { msg.textContent = 'Thanks! Your comment is awaiting moderation.'; msg.style.color = '#34d399'; }
            f.reset();
          } else if (msg) {
            msg.textContent = (res.j && res.j.error) || 'Comment failed.';
            msg.style.color = '#f87171';
          }
          if (btn) btn.disabled = false;
        })
        .catch(function() {
          if (msg) { msg.textContent = 'Network error — try again.'; msg.style.color = '#f87171'; }
          if (btn) btn.disabled = false;
        });
    });
  });

  // ════════════════════════════════════════════════
  //  Review (testimonial submission) forms
  // ════════════════════════════════════════════════
  document.querySelectorAll('form[data-review-form]').forEach(function(form) {
    var f = form as HTMLFormElement;
    var tid = f.getAttribute('data-teacher-id') || teacherId;
    var nameInput = f.querySelector('input[name="name"]') as HTMLInputElement | null;
    var ctxInput = f.querySelector('input[name="context"]') as HTMLInputElement | null;
    var textInput = f.querySelector('textarea[name="text"]') as HTMLTextAreaElement | null;
    var msg = f.querySelector('[data-review-msg]') as HTMLElement | null;
    var btn = f.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (!nameInput || !textInput) return;
    f.addEventListener('submit', function(ev) {
      ev.preventDefault();
      if (btn) btn.disabled = true;
      if (msg) { msg.textContent = 'Sending…'; msg.style.color = '#94a3b8'; }
      fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: tid, name: nameInput!.value, context: ctxInput ? ctxInput.value : '', text: textInput!.value }),
      })
        .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j }; }); })
        .then(function(res) {
          if (res.ok) {
            if (msg) { msg.textContent = 'Thank you! Your review is awaiting moderation. 💛'; msg.style.color = '#34d399'; }
            f.reset();
          } else if (msg) {
            msg.textContent = (res.j && res.j.error) || 'Submit failed.';
            msg.style.color = '#f87171';
          }
          if (btn) btn.disabled = false;
        })
        .catch(function() {
          if (msg) { msg.textContent = 'Network error — try again.'; msg.style.color = '#f87171'; }
          if (btn) btn.disabled = false;
        });
    });
  });

  // ════════════════════════════════════════════════
  //  Countdown timers
  // ════════════════════════════════════════════════
  document.querySelectorAll('[data-countdown]').forEach(function(el) {
    var target = new Date(el.getAttribute('data-countdown') || '').getTime();
    if (!Number.isFinite(target)) return;
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
      var diff = target - Date.now();
      var get = function(k) { return el.querySelector('[data-cd="' + k + '"]'); };
      if (diff <= 0) {
        var d0 = get('d'), h0 = get('h'), m0 = get('m'), s0 = get('s');
        if (d0) d0.textContent = '0'; if (h0) h0.textContent = '00';
        if (m0) m0.textContent = '00'; if (s0) s0.textContent = '00';
        return;
      }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor(diff / 3600000) % 24;
      var m = Math.floor(diff / 60000) % 60;
      var s = Math.floor(diff / 1000) % 60;
      var dd = get('d'), hh = get('h'), mm = get('m'), ss = get('s');
      if (dd) dd.textContent = String(d);
      if (hh) hh.textContent = pad(h);
      if (mm) mm.textContent = pad(m);
      if (ss) ss.textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  });

  // ════════════════════════════════════════════════
  //  Analytics beacon (privacy-friendly: page path only)
  // ════════════════════════════════════════════════
  try {
    var beaconPath = (location.pathname.split('/').pop() || 'index.html').slice(0, 200);
    var beaconBody = JSON.stringify({ teacherId: teacherId, path: beaconPath });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/views', beaconBody);
    } else {
      fetch('/api/views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: beaconBody, keepalive: true } as any);
    }
  } catch (e) {}

})();
`;
  fs.writeFileSync(path.join(distDirJs, 'script.js'), jsSrc + '\n' + chatJs);

  // Owner-only on-site editor: shipped as a separate asset and lazy-loaded
  // by script.js only after ownership is verified, so visitors never
  // download editor code.
  try {
    const editorSrc = fs.readFileSync(path.join(process.cwd(), 'js', 'site-editor.js'), 'utf8');
    fs.writeFileSync(path.join(distDirJs, 'editor.js'), editorSrc);
  } catch {
    // Editor is optional — the site works without it.
  }

  return teacherId
    ? 'Site built! Live at /s/' + teacherId
    : 'Site built successfully at /site-preview/';
}
