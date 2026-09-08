import path from 'path';
import fs from 'fs';
import { runBuild } from './db';

const inFlight = new Map<string, Promise<string>>();
const REBUILD_TTL_MS = 30_000;

function siteDir(teacherId: number | string): string {
  const idStr = String(teacherId);
  if (!/^(?:\d+|preview)$/.test(idStr)) throw new Error('Invalid teacherId for siteDir');
  const dist = path.join(process.cwd(), 'public', '_site', idStr);
  const root = path.join(process.cwd(), 'public', '_site');
  const resolved = path.resolve(dist);
  if (!resolved.startsWith(path.resolve(root) + path.sep) && resolved !== path.resolve(root)) throw new Error('Path traversal in siteDir');
  return dist;
}

function markerFile(teacherId: number | string): string {
  return path.join(siteDir(teacherId), '.built');
}

function isFresh(distDir: string): boolean {
  try {
    const raw = fs.readFileSync(path.join(distDir, '.built'), 'utf8');
    const marker = JSON.parse(raw);
    if (typeof marker.at !== 'number') return false;
    return Date.now() - marker.at < REBUILD_TTL_MS;
  } catch {
    return false;
  }
}

export interface BuildResult {
  message: string;
  cached: boolean;
}

/**
 * Build the static site once, reusing a fresh build for 30s and
 * coalescing concurrent build requests so a stampede of visitors
 * can never trigger N simultaneous builds of the same site.
 */
export async function ensureSiteBuild(
  data: any,
  teacherId?: number,
  force = false
): Promise<BuildResult> {
  // Fall back to a shared preview dir when no owner id is given so we
  // never write to a literal "_site/undefined" folder.
  const id: number | string = teacherId ?? 'preview';
  const key = `site-${id}`;
  const dist = siteDir(id);

  if (!force && isFresh(dist) && !inFlight.has(key)) {
    return { message: 'Site is up to date', cached: true };
  }

  const existing = inFlight.get(key);
  if (existing) {
    return { message: await existing, cached: true };
  }

  const job = (async () => {
    try {
      return await runBuild(data, id);
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, job);
  const message = await job;
  try {
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(dist, '.built'), JSON.stringify({ at: Date.now() }));
  } catch {
    // marker write failure must not break serving
  }
  return { message, cached: false };
}