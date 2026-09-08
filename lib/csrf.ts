import crypto from 'crypto';

/**
 * Double-submit CSRF: token = HMAC(sessionToken, CSRF_SECRET)
 * Client reads tf_csrf cookie (non-httpOnly, SameSite=Strict) and sends it as x-csrf-token header.
 * Server recomputes HMAC(sessionToken) and compares with header via timingSafeEqual.
 * Falls back to SameSite=strict as primary mitigation; this is defense-in-depth.
 */

function getSecret(): string {
  // Derive from DATABASE_URL + a stable pepper if no explicit secret — better than no CSRF at all.
  // For true prod, set CSRF_SECRET in .env
  return process.env.CSRF_SECRET || process.env.DATABASE_URL || 'tf-csrf-fallback-not-for-prod';
}

export function generateCsrfToken(sessionToken: string): string {
  const secret = getSecret();
  return crypto.createHmac('sha256', secret).update(sessionToken).digest('hex');
}

export function csrfCookieValue(sessionToken: string): string {
  return generateCsrfToken(sessionToken);
}

/**
 * Validate request — returns true if either:
 *  - No session (public route) — no CSRF needed
 *  - Header x-csrf-token matches HMAC(sessionToken)
 * Safe to call on every mutating route: pass the session token (or null).
 */
export function validateCsrf(request: Request, sessionToken: string | null | undefined): boolean {
  if (!sessionToken) return true; // public / unauthenticated — skip
  const header = request.headers.get('x-csrf-token') || request.headers.get('x-csrf_token') || '';
  const expected = generateCsrfToken(sessionToken);
  if (!header || header.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(header, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}
