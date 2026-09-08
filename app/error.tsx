'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Structured client log — never leak stack to UI
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: 'client error boundary', digest: error.digest, message: error.message?.slice(0,200) }));
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-950 text-slate-200 flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="ambient-glow top-[-120px] right-[-80px] w-[400px] h-[400px] bg-brand-500" />
      <div className="max-w-lg w-full glass-strong rounded-3xl p-8 text-center relative z-10">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-xl mb-4">⚠️</div>
        <h1 className="text-lg font-extrabold text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          We couldn&apos;t load that page. It&apos;s been logged and we&apos;ll look into it. Try again or head home.
        </p>
        {error.digest && <p className="text-[11px] font-mono text-slate-600 mb-4 break-all">Ref: {error.digest}</p>}
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => reset()} className="px-6 py-3 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg cursor-pointer hover:-translate-y-0.5 transition-all">Try again</button>
          <Link href="/" className="px-6 py-3 text-slate-200 rounded-xl font-semibold text-sm border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] no-underline">← Home</Link>
        </div>
      </div>
    </div>
  );
}
