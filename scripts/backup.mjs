#!/usr/bin/env node
/**
 * Backup helper — dumps Postgres (if USE_POSTGRES) or copies SQLite + uploads.
 * Usage:
 *   node scripts/backup.mjs              # auto-detect
 *   node scripts/backup.mjs --pg         # force pg_dump (needs DATABASE_URL)
 *   node scripts/backup.mjs --sqlite     # force sqlite
 *
 * Requires: pg_dump in PATH for Postgres, or just fs copy for SQLite.
 * Outputs to ./backups/teacher-YYYY-MM-DDTHH-mm-ss/
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const cwd = process.cwd();
const isPg = process.env.USE_POSTGRES === 'true' && !!process.env.DATABASE_URL;
const arg = process.argv[2] || '';
const forcePg = arg === '--pg';
const forceSqlite = arg === '--sqlite';
const mode = forcePg ? 'pg' : forceSqlite ? 'sqlite' : (isPg ? 'pg' : 'sqlite');

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
const outDir = path.join(cwd, 'backups', `teacher-${ts}`);
fs.mkdirSync(outDir, { recursive: true });

console.log(`Backup mode: ${mode} -> ${outDir}`);

if (mode === 'pg') {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }
  const dumpPath = path.join(outDir, 'db.sql');
  try {
    execSync(`pg_dump "${url}" --no-owner --no-privileges > "${dumpPath}"`, { stdio: 'inherit', shell: true });
    console.log(`Wrote ${dumpPath} (${(fs.statSync(dumpPath).size/1024).toFixed(1)} KB)`);
  } catch (e) {
    console.error('pg_dump failed — is it installed? (apt/brew install postgresql-client)');
    process.exit(1);
  }
  // Also snapshot uploads manifest
  const uploads = path.join(cwd, 'public', 'uploads');
  if (fs.existsSync(uploads)) {
    const list = fs.readdirSync(uploads).slice(0, 1000);
    fs.writeFileSync(path.join(outDir, 'uploads.json'), JSON.stringify({ count: list.length, files: list.slice(0,100) }, null, 2));
    console.log(`Uploads: ${list.length} files listed`);
  }
} else {
  const dbPath = path.join(cwd, 'data', 'teacher.db');
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, path.join(outDir, 'teacher.db'));
    console.log(`Copied SQLite ${dbPath}`);
  } else {
    console.log('No SQLite DB at data/teacher.db — skipping');
  }
  const uploads = path.join(cwd, 'public', 'uploads');
  if (fs.existsSync(uploads)) {
    const dest = path.join(outDir, 'uploads');
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(uploads)) {
      if (f === '.gitkeep') continue;
      try { fs.copyFileSync(path.join(uploads, f), path.join(dest, f)); } catch {}
    }
    console.log(`Copied uploads -> ${dest}`);
  }
}

console.log('Done. To restore:');
if (mode === 'pg') console.log(`  psql "$DATABASE_URL" < ${path.join(outDir, 'db.sql')}`);
else console.log(`  cp ${path.join(outDir, 'teacher.db')} data/teacher.db`);
