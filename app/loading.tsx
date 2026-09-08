export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="ambient-glow top-[-100px] right-[-80px] w-[400px] h-[400px] bg-brand-500" />
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 animate-pulse shadow-lg shadow-brand-500/20" />
        <div className="h-2.5 w-24 rounded-full bg-white/10 animate-pulse" />
        <div className="h-2 w-36 rounded-full bg-white/5 animate-pulse animation-delay-200" />
        <p className="text-xs text-slate-500 font-medium mt-2">Loading TeacherFolio…</p>
      </div>
    </div>
  );
}
