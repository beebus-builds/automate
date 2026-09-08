import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Readiness probe — checks DB connectivity.
 * Returns 200 only when the app can actually serve traffic.
 */
export async function GET() {
  const started = Date.now();
  let db: 'ok' | 'fail' = 'fail';
  let latencyMs = 0;
  let details: string | undefined;

  try {
    const t0 = Date.now();
    await pool.query('SELECT 1 as ok');
    latencyMs = Date.now() - t0;
    db = 'ok';
  } catch (e: any) {
    details = e?.message?.slice(0, 200) || 'db unreachable';
    logger.warn('readiness db check failed', { err: e, durationMs: Date.now() - started });
  }

  const ok = db === 'ok';
  return NextResponse.json(
    {
      ok,
      service: 'teacher-portfolio',
      checks: { db, latencyMs },
      ...(details ? { details } : {}),
      ts: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
}
