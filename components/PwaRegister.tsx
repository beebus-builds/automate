'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaRegister() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('SW registered for offline support'))
        .catch(() => {});
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === 'accepted') setInstallEvt(null);
  };

  if (!installEvt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[1000] glass-strong rounded-2xl p-4 shadow-glow animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-lg shadow-md shadow-brand-500/20">
          ⬇️
        </div>
        <div>
          <div className="text-sm font-bold text-white">Install TeacherFolio</div>
          <div className="text-xs text-slate-400">Open it like a native app</div>
        </div>
        <button onClick={handleInstall} className="px-4 py-2 ml-2 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 transition-all cursor-pointer">
          Install
        </button>
      </div>
    </div>
  );
}
