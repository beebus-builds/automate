'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-surface-950 text-slate-200 font-sans flex flex-col relative overflow-hidden">
      <div className="ambient-glow top-[-120px] right-[-80px] w-[400px] h-[400px] bg-brand-500" />
      <div className="ambient-glow bottom-[-160px] left-[-120px] w-[500px] h-[500px] bg-purple-500" />

      <header className="px-6 py-5 relative z-10">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="flex items-center no-underline">
            <Logo size={30} wordmark />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="glass-strong rounded-3xl p-8 md:p-10 max-w-lg w-full text-center animate-fade-up">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20 mb-4">
            📡
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight mb-2">You&apos;re offline</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            TeacherFolio needs a connection to load fresh pages. Pages you&apos;ve already visited are cached and will open when you go back. Reconnect and try again.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => typeof window !== 'undefined' && window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              ⟳ Retry
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 text-slate-200 rounded-xl font-semibold text-sm border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all no-underline"
            >
              ← Home
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-3 text-left">
            <Link href="/build" className="glass rounded-xl p-3 no-underline hover:bg-white/[0.05] transition-colors">
              <div className="text-sm">💬</div>
              <div className="text-xs font-bold text-white">Build</div>
              <div className="text-[11px] text-slate-500">Continue where you left off</div>
            </Link>
            <Link href="/directory" className="glass rounded-xl p-3 no-underline hover:bg-white/[0.05] transition-colors">
              <div className="text-sm">📚</div>
              <div className="text-xs font-bold text-white">Directory</div>
              <div className="text-[11px] text-slate-500">Browse cached listings</div>
            </Link>
          </div>

          <p className="text-[11px] text-slate-600 mt-4">
            Tip: Install TeacherFolio to open it like a native app and keep recent pages available offline.
          </p>
        </div>
      </div>

      <footer className="px-6 py-4 text-center text-xs text-slate-600 relative z-10">Offline — cached pages still work</footer>
    </div>
  );
}
