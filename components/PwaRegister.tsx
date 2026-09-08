'use client';

import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaRegister() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    // Offline indicator
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Persist deferred prompt across reloads via sessionStorage flag (event itself can't be persisted)
    const dismissed = typeof window !== 'undefined' ? sessionStorage.getItem('pwa-install-dismissed') : null;

    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.unregister())))
          .catch(() => {});
      } else {
        let registration: ServiceWorkerRegistration | null = null;
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((reg) => {
            registration = reg;
            // If there's already a waiting worker (update downloaded while page was closed)
            if (reg.waiting) {
              waitingWorkerRef.current = reg.waiting;
              setUpdateReady(true);
            }
            reg.addEventListener('updatefound', () => {
              const nw = reg.installing;
              if (!nw) return;
              nw.addEventListener('statechange', () => {
                if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                  waitingWorkerRef.current = nw;
                  setUpdateReady(true);
                }
              });
            });
          })
          .catch(() => {});

        // Reload once when new SW takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        // Check for updates on visibility (user returns to tab)
        const onVis = () => {
          if (document.visibilityState === 'visible') registration?.update().catch(() => {});
        };
        document.addEventListener('visibilitychange', onVis);

        // Also poll hourly while tab is open
        const iv = window.setInterval(() => registration?.update().catch(() => {}), 60 * 60 * 1000);

        return () => {
          document.removeEventListener('visibilitychange', onVis);
          window.clearInterval(iv);
        };
      }
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (dismissed === '1') return;
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallEvt(null);
      sessionStorage.removeItem('pwa-install-dismissed');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallEvt(null);
    } else {
      // Remember dismissal for this session only — prompt again next session
      try { sessionStorage.setItem('pwa-install-dismissed', '1'); } catch {}
      setInstallEvt(null);
    }
  };

  const handleDismissInstall = () => {
    try { sessionStorage.setItem('pwa-install-dismissed', '1'); } catch {}
    setInstallEvt(null);
  };

  const handleUpdate = () => {
    waitingWorkerRef.current?.postMessage({ type: 'SKIP_WAITING' });
    setUpdateReady(false);
  };

  return (
    <>
      {/* Offline banner */}
      {offline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[1001] bg-amber-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
          <span>📡</span> Offline — cached pages still work
        </div>
      )}

      {/* Update available */}
      {updateReady && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[1000] glass-strong rounded-2xl p-4 shadow-glow animate-slide-up border border-brand-500/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm shadow-md shadow-emerald-500/20 flex-shrink-0">↻</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white leading-tight">Update available</div>
              <div className="text-xs text-slate-400 leading-relaxed">A new version of TeacherFolio is ready. Reload to get the latest.</div>
              <div className="mt-2.5 flex gap-2">
                <button onClick={handleUpdate} className="px-3.5 py-1.5 bg-white text-surface-950 rounded-lg font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer">Reload</button>
                <button onClick={() => setUpdateReady(false)} className="px-3.5 py-1.5 bg-white/10 text-slate-300 rounded-lg font-semibold text-xs hover:bg-white/15 transition-colors cursor-pointer">Later</button>
              </div>
            </div>
            <button onClick={() => setUpdateReady(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none px-1 -mt-1">×</button>
          </div>
        </div>
      )}

      {/* Install prompt */}
      {installEvt && !updateReady && (
        <div className="fixed bottom-4 right-4 z-[1000] glass-strong rounded-2xl p-4 shadow-glow animate-slide-up max-w-[360px] border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-lg shadow-md shadow-brand-500/20 flex-shrink-0">
              ⬇️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white leading-tight">Install TeacherFolio</div>
              <div className="text-xs text-slate-400">Open it like a native app — works offline</div>
            </div>
            <button onClick={handleInstall} className="px-4 py-2 ml-2 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 transition-all cursor-pointer flex-shrink-0">
              Install
            </button>
            <button onClick={handleDismissInstall} aria-label="Dismiss" className="text-slate-500 hover:text-slate-300 text-lg leading-none px-1">×</button>
          </div>
        </div>
      )}
    </>
  );
}
