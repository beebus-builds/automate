'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: 'global error', digest: error.digest, message: error.message?.slice(0,200) }));
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', background: '#090d16', color: '#e2e8f0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 16px', borderRadius: 16, background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 8 }}>Application error</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>A critical error occurred. Please reload the page. If it persists, contact support.</p>
          {error.digest && <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', wordBreak: 'break-all', marginBottom: 12 }}>Ref: {error.digest}</p>}
          <button onClick={() => reset()} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Reload</button>
        </div>
      </body>
    </html>
  );
}
