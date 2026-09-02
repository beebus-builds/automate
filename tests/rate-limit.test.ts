import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-ratelimit-'));

describe('DB-backed rate limiting', () => {
  beforeAll(async () => {
    process.env.TEACHER_DB_PATH = path.join(tmpDir, 'test.db');
    process.env.USE_POSTGRES = 'false';
    await import('../lib/rate-limit');
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // The sqlite handle stays open for the process lifetime on Windows —
      // best-effort cleanup is fine, the dir lives in the OS temp folder.
    }
  });

  it('allows requests under the limit and blocks over it', async () => {
    const { rateLimit } = await import('../lib/rate-limit');
    const key = `unit:${Date.now()}`;

    for (let i = 0; i < 3; i++) {
      const r = await rateLimit(key, 3, 60_000);
      expect(r.allowed).toBe(true);
    }
    const blocked = await rateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets the window after it expires', async () => {
    const { rateLimit } = await import('../lib/rate-limit');
    const key = `unit-window:${Date.now()}`;
    await rateLimit(key, 1, 1);
    const blocked = await rateLimit(key, 1, 1);
    expect(blocked.allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    const fresh = await rateLimit(key, 1, 1);
    expect(fresh.allowed).toBe(true);
  });

  it('does not let one key block another', async () => {
    const { rateLimit } = await import('../lib/rate-limit');
    await rateLimit('unit:a', 1, 60_000);
    await rateLimit('unit:a', 1, 60_000);
    const other = await rateLimit('unit:b', 1, 60_000);
    expect(other.allowed).toBe(true);
  });
});