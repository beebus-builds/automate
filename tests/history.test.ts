import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-history-'));

describe('version history', () => {
  beforeAll(async () => {
    process.env.TEACHER_DB_PATH = path.join(tmpDir, 'test.db');
    process.env.USE_POSTGRES = 'false';
    await import('../lib/db');
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // sqlite handle stays open on Windows — best-effort cleanup
    }
  });

  it('summarizes snapshots without leaking full payloads', async () => {
    const { summarizeHistoryData } = await import('../lib/db');
    const s = summarizeHistoryData({
      site: { title: 'My School' },
      hero: { title: 'Hello class' },
      courses: [{}, {}, {}],
      achievements: [{}],
    });
    expect(s.siteTitle).toBe('My School');
    expect(s.heroTitle).toBe('Hello class');
    expect(s.courses).toBe(3);
    expect(s.achievements).toBe(1);
    expect(s.sizeBytes).toBeGreaterThan(0);
  });

  it('pushes snapshots and lists newest-first entries', async () => {
    const { pushHistory, getHistoryEntries, getHistoryEntry } = await import('../lib/db');
    const userId = 9001 + Math.floor(Math.random() * 100000);
    await pushHistory({ site: { title: 'v1' }, hero: { title: 'one' }, courses: [] }, userId);
    await pushHistory({ site: { title: 'v2' }, hero: { title: 'two' }, courses: [{}, {}] }, userId);

    const entries = await getHistoryEntries(userId, 20);
    expect(entries.length).toBe(2);
    expect(entries[0].summary.siteTitle).toBe('v2');
    expect(entries[0].summary.courses).toBe(2);
    expect(entries[1].summary.siteTitle).toBe('v1');
    // List must not embed full snapshots
    expect((entries[0] as any).data).toBeUndefined();

    const single = await getHistoryEntry(entries[0].id, userId);
    expect(single?.data?.hero?.title).toBe('two');

    // Other users cannot read it
    const missing = await getHistoryEntry(entries[0].id, userId + 999999);
    expect(missing).toBeNull();
  });
});
