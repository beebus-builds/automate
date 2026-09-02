import path from 'path';
import fs from 'fs';
import { runBuild } from './db';

const inFlight = new Map<string, Promise<string>>();
const REBUILD_TTL_MS = 30_000;

function siteDir(teacherId?: number): string {
  return path.join(
    process.cwd(),
    'public',
    '_site',
    teacherId ? String(teacherId) : ''
  );
}

function markerFile(teacherId?: number): string {
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
  const key = teacherId ? `site-${teacherId}` : 'site-global';
  const dist = siteDir(teacherId);

  if (!force && isFresh(dist) && !inFlight.has(key)) {
    return { message: 'Site is up to date', cached: true };
  }

  const existing = inFlight.get(key);
  if (existing) {
    return { message: await existing, cached: true };
  }

  const job = (async () => {
    try {
      return await runBuild(data, teacherId);
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