'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';
import { SkeletonCalls } from '@/components/Skeleton';

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL || 'ws://localhost:8765/ws/signal';

export default function CallsPage() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [calls, setCalls] = useState<any[]>([]);
  const [activeCall, setActiveCall] = useState<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => { setAuthChecked(true); if (d.user) setUser(d.user); }).catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    const poll = async () => { try { const r = await fetch('/api/calls'); const d = await r.json(); setCalls(d.calls || []); } catch {} };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const answerCall = async (call: any) => {
    await fetch('/api/calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'answer', callId: call.id }) });
    setActiveCall(call);
    setCalls(prev => prev.filter(c => c.id !== call.id));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const ws = new WebSocket(SIGNAL_URL);
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'join', role: 'visitor', room: call.roomId }));
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'joined') {
          const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          pcRef.current = pc;
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
          pc.onicecandidate = (e) => { if (e.candidate) ws.send(JSON.stringify({ type: 'ice_candidate', candidate: e.candidate, room: call.roomId })); };
          pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; };
        }
        if (msg.type === 'offer') { const pc = pcRef.current; if (!pc) return; await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); ws.send(JSON.stringify({ type: 'answer', sdp: answer, room: call.roomId })); }
        if (msg.type === 'ice_candidate' && msg.candidate && pcRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
        if (msg.type === 'peer_disconnected') endCall();
      };
    } catch { endCall(); }
  };

  const endCall = () => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (activeCall) fetch('/api/calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'end', callId: activeCall.id }) }).catch(() => {});
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setActiveCall(null);
  };

  if (!authChecked) return <SkeletonCalls />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-950 text-slate-200 font-sans items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-12 text-center shadow-2xl shadow-black/50 max-w-sm">
          <div className="text-5xl mb-5">🔒</div>
          <h1 className="text-2xl font-black text-white mb-3">Sign In Required</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">Sign in to receive calls from teachers who want a video chat.</p>
          <button onClick={() => setIsAuthOpen(true)} className="w-full py-3.5 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all">Sign In</button>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
      </div>
    );
  }

  if (activeCall) {
    return (
      <div className="h-screen bg-surface-900 flex flex-col font-sans">
        <div className="flex-1 relative">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-5 right-5 w-44 h-36 rounded-xl shadow-2xl" style={{ transform: 'scaleX(-1)' }} />
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-surface-900/50 backdrop-blur-sm rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">{activeCall.teacherName}</span>
          </div>
        </div>
        <div className="px-6 py-4 bg-surface-800/80 backdrop-blur-lg border-t border-white/5 flex items-center justify-center gap-5">
          <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-slate-200 font-sans">
      <header className="glass-strong border-b border-white/[0.06] px-6 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="flex items-center no-underline text-white">
            <Logo size={28} wordmark />
          </Link>
          <div className="w-4 h-4 rounded-full bg-white/10" />
          <Link href="/build" className="text-xs text-slate-400 no-underline font-medium hover:text-slate-200 transition-colors">← Build</Link>
          <span className="ml-auto text-xs font-semibold text-brand-300">👤 {user.name}</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-8">
        <h1 className="text-2xl font-black text-white tracking-tight mb-1">📞 Call Dashboard</h1>
        <p className="text-sm text-slate-500 mb-8">Keep this page open to receive incoming calls from teachers.</p>

        {calls.length === 0 && (
          <div className="glass rounded-3xl py-16 px-6 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-white/[0.06] flex items-center justify-center text-3xl mx-auto mb-5">
              📱
            </div>
            <h2 className="text-sm font-bold text-white mb-2">No incoming calls</h2>
            <p className="text-sm text-slate-500 mb-6">Keep this page open. When a teacher reaches out, the call will appear here.</p>
            <div className="flex gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {calls.map((call: any) => (
          <div key={call.id} className="glass rounded-2xl p-5 mb-3 flex items-center justify-between group hover:bg-white/[0.04] transition-colors animate-fade-up">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-lg shadow-lg shadow-brand-500/20">📞</div>
              <div>
                <div className="font-bold text-sm text-white">{call.teacherName}</div>
                <div className="text-xs text-slate-500 mt-0.5">{new Date(call.createdAt).toLocaleTimeString()} · {call.status}</div>
              </div>
            </div>
            {call.status === 'ringing' && (
              <button onClick={() => answerCall(call)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/25 hover:-translate-y-0.5 transition-all">Answer</button>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}