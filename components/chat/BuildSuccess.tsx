'use client';

import Link from 'next/link';

interface Props {
  name: string;
  downloadUrl: string;
  deployUrl: string;
  publicUrl: string;
  deployStatus: string;
  onDeploy: () => void;
}

export function BuildSuccess({ name, downloadUrl, deployUrl, publicUrl, deployStatus, onDeploy }: Props) {
  const showUrl = deployUrl || publicUrl;
  return (
    <div className="glass rounded-3xl p-8 mt-6 text-center shadow-glow animate-slide-up">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-2xl mx-auto mb-5 shadow-glow">
        ✅
      </div>
      <h3 className="text-lg font-black text-white mb-2">{name || 'Teacher'}&apos;s Website is Ready!</h3>

      {showUrl ? (
        <p className="text-sm text-emerald-400 mb-5">
          {deployUrl ? 'Deployed' : 'Published'} URL:{' '}
          <a href={showUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">{showUrl}</a>
        </p>
      ) : (
        <p className="text-sm text-slate-400 mb-6">Download your standalone bundle or deploy live.</p>
      )}

      <div className="flex gap-3 justify-center flex-wrap">
        <a href={downloadUrl} download className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all no-underline">
          📦 Download ZIP Bundle
        </a>
        <a href={publicUrl || '/site-preview'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-white/8 border border-white/12 text-white rounded-xl font-semibold text-sm hover:bg-white/12 transition-all no-underline">
          👁 View Live Site
        </a>
        {!deployUrl && (
          <button onClick={onDeploy} disabled={deployStatus === 'deploying'} className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {deployStatus === 'deploying' ? 'Deploying...' : '🚀 Deploy Live'}
          </button>
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-white/[0.06] flex gap-6 justify-center text-xs">
        <Link href="/cms" className="text-brand-400 no-underline hover:underline">Open in CMS →</Link>
        <span className="text-slate-700">|</span>
        <Link href="/" className="text-slate-500 no-underline hover:text-slate-300 transition-colors">Return Home</Link>
      </div>
    </div>
  );
}
