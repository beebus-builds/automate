import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
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

  // Mutating requests with a session must present valid double-submit CSRF
  // tf_session (httpOnly) + tf_csrf (readable) vs x-csrf-token header.
  // Primary mitigation is SameSite=Strict; this is defense-in-depth.
  const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (isMutating && pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/health') && !pathname.startsWith('/api/ready')) {
    const session = request.cookies.get('tf_session')?.value;
    if (session) {
      const csrfCookie = request.cookies.get('tf_csrf')?.value || '';
      const csrfHeader = request.headers.get('x-csrf-token') || request.headers.get('x-csrf_token') || '';
      // If client has a CSRF cookie (modern flow), enforce match; legacy sessions without cookie are allowed to pass
      // to avoid breaking old logins — they will get a new cookie on next login/rotate.
      if (csrfCookie && csrfHeader !== csrfCookie) {
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