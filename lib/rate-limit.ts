import { pool, backend } from './db';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

// NOTE: better-sqlite3 binds each `?` occurrence positionally, so repeated
// parameters must be repeated in the params array (db.ts rewrites $n -> ?).
//
// `window_start` stores the absolute expiry of the current window.
// $2 is "now" and $3 is "now + windowMs" (the expiry). The window only resets
// once the stored expiry is in the past.
const UPSERT = `
  INSERT INTO rate_limits (rl_key, hits, window_start)
  VALUES ($1, 1, $3)
  ON CONFLICT (rl_key) DO UPDATE SET
    hits = CASE WHEN window_start < $2 THEN 1 ELSE hits + 1 END,
    window_start = CASE WHEN window_start < $2 THEN $3 ELSE window_start END
  RETURNING hits, window_start
`;

/**
 * DB-backed fixed-window rate limiter. Works on both PostgreSQL and SQLite,
 * survives restarts, and is safe across multiple server instances.
 * Note: db.ts rewrites `$n` placeholders to `?` for SQLite automatically.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiryIso = new Date(now + windowMs).toISOString();

  // Opportunistically purge stale rows so the table stays small.
  if (Math.random() < 0.02) {
    try {
      const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      await pool.query('DELETE FROM rate_limits WHERE window_start < $1', [cutoff]);
    } catch {
      // cleanup must never break the request
    }
  }

  try {
    const params =
      backend === 'sqlite'
        ? [key, expiryIso, nowIso, nowIso, expiryIso]
        : [key, nowIso, expiryIso];
    const { rows } = await pool.query(UPSERT, params);
    const row = rows[0];
    if (!row) return { allowed: true };

    const hits = Number(row.hits);
    const expiryTime = new Date(row.window_start).getTime();
    if (hits > max) {
      return { allowed: false, retryAfterMs: Math.max(1, expiryTime - now) };
    }
    return { allowed: true };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    // Fail open on DB hiccups rather than breaking auth/upload flows.
    return { allowed: true };
  }
}

/** Extract a client IP from the forwarded headers (used for per-IP limits). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim().slice(0, 64) || 'unknown';
  return headers.get('x-real-ip')?.slice(0, 64) || 'unknown';
}