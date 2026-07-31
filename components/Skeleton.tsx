'use client';

export function SkeletonPage() {
  return (
    <div className="h-screen w-full bg-surface-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-fade-up">
        <div className="skeleton skeleton-circle w-14 h-14" />
        <div className="flex flex-col gap-3 items-center">
          <div className="skeleton skeleton-text w-40" />
          <div className="skeleton skeleton-text w-28 opacity-60" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCms() {
  return (
    <div className="cms">
      <div className="cms-sidebar">
        <div className="cms-sidebar-brand flex items-center gap-2.5">
          <div className="skeleton skeleton-circle w-8 h-8" />
          <div className="flex flex-col gap-1.5">
            <div className="skeleton skeleton-text w-28" />
            <div className="skeleton skeleton-text w-20 opacity-60" style={{ height: 8 }} />
          </div>
        </div>
        <div className="cms-sidebar-nav flex flex-col gap-1 px-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="skeleton skeleton-circle w-5 h-5" />
              <div className="skeleton skeleton-text w-24" style={{ height: 10 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="cms-main">
        <div className="cms-topbar">
          <div className="skeleton skeleton-text w-32" style={{ height: 14 }} />
          <div className="skeleton skeleton-text w-24" style={{ height: 12 }} />
        </div>
        <div className="cms-body">
          <div className="cms-content p-7 flex flex-col gap-4">
            <div className="skeleton skeleton-text w-48" style={{ height: 20 }} />
            <div className="skeleton skeleton-text w-64 opacity-60" style={{ height: 12 }} />
            <div className="grid grid-cols-4 gap-3 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-24" />
              ))}
            </div>
            <div className="skeleton rounded-xl h-36 mt-2" />
            <div className="skeleton rounded-xl h-44 mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonCalls() {
  return (
    <div className="h-screen w-full bg-surface-900 flex flex-col items-center justify-center gap-4">
      <div className="skeleton skeleton-circle w-20 h-20" />
      <div className="skeleton skeleton-text w-36" style={{ height: 14 }} />
      <div className="skeleton skeleton-text w-24 opacity-60" style={{ height: 10 }} />
      <div className="flex gap-3 mt-2">
        <div className="skeleton skeleton-circle w-12 h-12" />
        <div className="skeleton skeleton-circle w-12 h-12" />
      </div>
    </div>
  );
}
