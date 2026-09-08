import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { listPublicSites } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Teacher Directory',
  description: 'Discover teacher portfolios built with TeacherFolio.',
};

export default async function DirectoryPage() {
  const sites = await listPublicSites(60);

  return (
    <div className="min-h-screen bg-surface-950 text-slate-200 font-sans">
      <header className="glass-strong border-b border-white/[0.06] px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="flex items-center no-underline text-white">
            <Logo size={28} wordmark />
          </Link>
          <Link href="/build" className="ml-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-purple-600 no-underline shadow-lg shadow-brand-500/25">
            Build yours →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="text-center mb-10">
          <span className="inline-block text-[0.65rem] font-bold uppercase tracking-[1.5px] text-brand-400 px-3 py-1 bg-brand-500/10 rounded-full mb-4">Community</span>
          <h1 className="text-3xl font-black text-white tracking-tight">Teacher Directory</h1>
          <p className="text-sm text-slate-500 mt-2">Real portfolios built with TeacherFolio. {sites.length > 0 && `${sites.length} and counting.`}</p>
        </div>

        {sites.length === 0 ? (
          <div className="glass rounded-3xl py-16 px-6 text-center max-w-md mx-auto">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-sm font-bold text-white mb-2">No public sites yet</h2>
            <p className="text-xs text-slate-500 mb-6">Be the first teacher listed here.</p>
            <Link href="/build" className="inline-flex px-6 py-3 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm no-underline shadow-lg shadow-brand-500/25">
              Start building
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map(s => (
              <a key={s.teacherId} href={`/s/${s.teacherId}`} target="_blank" rel="noreferrer"
                className="glass rounded-2xl p-5 no-underline hover:bg-white/[0.04] hover:-translate-y-1 transition-all group block">
                <div className="flex items-center gap-3 mb-3">
                  {s.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo} alt="" className="w-11 h-11 rounded-full object-cover border border-white/20" loading="lazy" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-sm font-black text-white">
                      {s.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate group-hover:text-brand-300 transition-colors">{s.name}</div>
                    {s.subject && <div className="text-[0.65rem] font-semibold text-brand-300/80 uppercase tracking-wider truncate">{s.subject}</div>}
                  </div>
                </div>
                {s.tagline && <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-3">{s.tagline}</p>}
                <span className="text-[0.65rem] font-bold text-slate-500 group-hover:text-brand-300 transition-colors">Visit site →</span>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
