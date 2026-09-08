#!/usr/bin/env node
/**
 * Restore helper — import a prior backup.
 * Usage:
 *   node scripts/restore.mjs backups/teacher-2026-09-08T01-00-00/db.sql
 *   node scripts/restore.mjs backups/teacher-2026-09-08T01-00-00/teacher.db
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const src = process.argv[2];
if (!src || !fs.existsSync(src)) { console.error('Usage: node scripts/restore.mjs <backup-file>'); process.exit(1); }

if (src.endsWith('.sql')) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }
  console.log(`Restoring Postgres from ${src} ...`);
  execSync(`psql "${url}" < "${src}"`, { stdio: 'inherit', shell: true });
  console.log('Restore done');
} else if (src.endsWith('.db')) {
  const dest = path.join(process.cwd(), 'data', 'teacher.db');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Restored SQLite -> ${dest}`);
} else {
  console.error('Unknown file type — expected .sql or .db');
  process.exit(1);
}
