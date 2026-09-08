'use client';

import { useEffect } from 'react';

export default function CsrfInjector() {
  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
        const method = (init?.method || (input instanceof Request ? (input as Request).method : 'GET') || 'GET').toUpperCase();
        const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
        const isApi = typeof url === 'string' && url.includes('/api/');
        if (isMutating && isApi) {
          const m = document.cookie.match(/(?:^|; )tf_csrf=([^;]*)/);
          const tok = m ? decodeURIComponent(m[1]) : '';
          if (tok) {
            init = init || {};
            const headers = new Headers(init.headers || (input instanceof Request ? (input as Request).headers : undefined));
            if (!headers.has('x-csrf-token')) headers.set('x-csrf-token', tok);
            init.headers = headers;
          }
        }
      } catch {}
      return origFetch(input as any, init as any);
    }) as any;
  }, []);
  return null;
}
