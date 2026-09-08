'use client';

/**
 * Client helper: read tf_csrf cookie and return value for x-csrf-token header.
 * Call this before any mutating fetch when a session exists.
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|; )tf_csrf=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function csrfHeaders(extra?: HeadersInit): HeadersInit {
  const tok = getCsrfToken();
  const h: Record<string, string> = {};
  if (tok) h['x-csrf-token'] = tok;
  if (extra) Object.assign(h, extra as Record<string, string>);
  return h;
}

/**
 * Wrapper around fetch that auto-attaches CSRF header for same-origin mutating requests.
 * Use instead of raw fetch for POST/PUT/PATCH/DELETE to /api/* .
 */
export async function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (isMutating && typeof window !== 'undefined') {
    const tok = getCsrfToken();
    if (tok) {
      init = { ...init, headers: { ...(init?.headers as Record<string, string> || {}), 'x-csrf-token': tok } };
    }
  }
  return fetch(input, init);
}
