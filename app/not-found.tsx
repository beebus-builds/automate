import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
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

      <div className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="text-center max-w-md animate-fade-up">
          <div className="text-[5rem] font-black tracking-tight bg-gradient-to-br from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-none mb-2">
            404
          </div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[1.5px] text-brand-400 mb-4">Page not found</p>
          <h1 className="text-lg font-extrabold text-white mb-3">This page has gone on a break</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to teaching.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all no-underline">
              ← Back Home
            </Link>
            <Link href="/build" className="inline-flex items-center gap-2 px-6 py-3 text-slate-200 rounded-xl font-semibold text-sm border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all no-underline">
              Build a Site
            </Link>
          </div>
        </div>
      </div>

      <footer className="px-6 py-4 text-center text-xs text-slate-600 relative z-10">© 2026 TeacherFolio</footer>
    </div>
  );
}
