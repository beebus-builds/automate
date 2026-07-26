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
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      onAuthSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: 36, width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
            {mode === 'login' ? 'Welcome Back 👋' : 'Create Account 🚀'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#fca5a5', fontSize: '.85rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Johnson"
                style={{ width: '100%', padding: '12px 16px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: '.95rem', outline: 'none' }}
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.edu"
              style={{ width: '100%', padding: '12px 16px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: '.95rem', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 16px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: '.95rem', outline: 'none' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, marginTop: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '.85rem', color: '#94a3b8' }}>
          {mode === 'login' ? (
            <span>Don't have an account? <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Register</button></span>
          ) : (
            <span>Already have an account? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Sign In</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
