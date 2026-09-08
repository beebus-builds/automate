import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function hmacHex(message: string, secret: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const key = await (globalThis as any).crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await (globalThis as any).crypto.subtle.sign('HMAC', key, enc.encode(message));
    return Array.from(new Uint8Array(sig as ArrayBuffer)).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback to Node crypto if subtle not available (should not happen on edge)
    try {
      const { createHmac } = await import('node:crypto');
      return createHmac('sha256', secret).update(message).digest('hex');
    } catch { return ''; }
  }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // SW and manifest need special headers — bypass the generic security headers
  if (pathname === '/sw.js') {
    const res = NextResponse.next();
    res.headers.set('Content-Type', 'application/javascript; charset=utf-8');
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.headers.set('Service-Worker-Allowed', '/');
    return res;
  }
  if (pathname === '/manifest.json') {
    const res = NextResponse.next();
    res.headers.set('Content-Type', 'application/manifest+json; charset=utf-8');
    res.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res;
  }

  // Mutating requests with a session must present valid CSRF
  // Defense-in-depth: SameSite=Strict is primary; this verifies HMAC(session, secret) via double-submit.
  // Previous bypass allowed legacy sessions without cookie to skip; now we enforce header == HMAC(session).
  const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (isMutating && pathname.startsWith('/api/') && !pathname.startsWith('/api/health') && !pathname.startsWith('/api/ready')) {
    const session = request.cookies.get('tf_session')?.value;
    if (session) {
      const csrfHeader = request.headers.get('x-csrf-token') || request.headers.get('x-csrf_token') || '';
      const secret = process.env.CSRF_SECRET || process.env.DATABASE_URL || 'tf-csrf-fallback-not-for-prod';
      const expected = await hmacHex(session, secret);
      // Require header; also optionally verify cookie matches expected for double-submit consistency
      const csrfCookie = request.cookies.get('tf_csrf')?.value || '';
      const headerValid = csrfHeader && expected && timingSafeEqualStr(csrfHeader, expected);
      const cookieValid = !csrfCookie || timingSafeEqualStr(csrfCookie, expected);
      if (!headerValid || !cookieValid) {
        // Allow unauthenticated login/register (no session) — but for authenticated POST /api/auth/token etc, require CSRF
        // If this is a public auth action without session, the early `if(session)` would have skipped, so we are here only with session
        return new NextResponse(JSON.stringify({ error: 'CSRF validation failed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
    }
  }

  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  // HSTS only makes sense on HTTPS (production). Setting it in dev on
  // http://localhost can permanently pin localhost to HTTPS in the browser.
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};