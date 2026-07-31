'use client';

import { useState } from 'react';

export function AuthModal({ isOpen, onClose, onAuthSuccess }: { isOpen: boolean; onClose: () => void; onAuthSuccess: (user: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          email,
          password,
          name: mode === 'register' ? name : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      onAuthSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="glass-strong rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-black/50 scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-white">
            {mode === 'login' ? 'Welcome Back 👋' : 'Create Account 🚀'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Sarah Johnson" className="w-full px-4 py-3 bg-surface-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-600" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@school.edu" className="w-full px-4 py-3 bg-surface-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-600" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-surface-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-600" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 mt-1 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-5 text-sm text-slate-500">
          {mode === 'login' ? (
            <span>Don&apos;t have an account? <button onClick={() => setMode('register')} className="bg-none border-none text-brand-400 font-semibold cursor-pointer hover:underline">Register</button></span>
          ) : (
            <span>Already have an account? <button onClick={() => setMode('login')} className="bg-none border-none text-brand-400 font-semibold cursor-pointer hover:underline">Sign In</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
