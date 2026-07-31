'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';

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
    fetch('/api/auth').then(r => r.json()).then(d => {
      setAuthChecked(true);
      if (d.user) setUser(d.user);
    }).catch(() => setAuthChecked(true));
  }, []);

  // Poll for pending calls
  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      try {
        const r = await fetch('/api/calls');
        const d = await r.json();
        setCalls(d.calls || []);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const requestNotification = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => { requestNotification(); }, []);

  const answerCall = async (call: any) => {
    // Mark as answered
    await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'answer', callId: call.id }),
    });

    setActiveCall(call);
    setCalls(prev => prev.filter(c => c.id !== call.id));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const ws = new WebSocket(SIGNAL_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', role: 'visitor', room: call.roomId }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'joined') {
          const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          pcRef.current = pc;
          stream.getTracks().forEach(t => pc.addTrack(t, stream));

          pc.onicecandidate = (e) => {
            if (e.candidate) ws.send(JSON.stringify({ type: 'ice_candidate', candidate: e.candidate, room: call.roomId }));
          };
          pc.ontrack = (e) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
          };
        }

        if (msg.type === 'offer') {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', sdp: answer, room: call.roomId }));
        }

        if (msg.type === 'ice_candidate' && msg.candidate && pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }

        if (msg.type === 'peer_disconnected') {
          endCall();
        }
      };
    } catch {
      endCall();
    }
  };

  const endCall = () => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (activeCall) {
      fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', callId: activeCall.id }),
      }).catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActiveCall(null);
  };

  if (!authChecked) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#94a3b8' }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 12px' }}>Sign In Required</h1>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>Sign in to receive calls.</p>
          <button onClick={() => setIsAuthOpen(true)} style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Sign In</button>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
      </div>
    );
  }

  // Active call overlay
  if (activeCall) {
    return (
      <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: 20, right: 20, width: 180, borderRadius: 12, transform: 'scaleX(-1)' }} />
        </div>
        <div style={{ padding: '20px 24px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <span style={{ color: '#34d399', fontWeight: 700, fontSize: '.9rem' }}>● {activeCall.teacherName}</span>
          <button onClick={endCall} style={{ padding: '14px 40px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
            End Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      <header style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff' }}>
          <Logo size={32} />
          <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>TeacherFolio</span>
        </Link>
        <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,0.15)' }} />
        <Link href="/build" style={{ fontSize: '.85rem', color: '#94a3b8', textDecoration: 'none' }}>← Build</Link>
        <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: '#a5b4fc', fontWeight: 600 }}>👤 {user.name}</span>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 6px' }}>📞 Call Dashboard</h1>
        <p style={{ color: '#94a3b8', fontSize: '.9rem', marginBottom: 28 }}>
          Keep this page open to receive calls from teachers.
        </p>

        {calls.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📱</div>
            <p>No incoming calls. Waiting for a teacher to call...</p>
            <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulseD 1s infinite' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulseD 1s infinite 0.2s' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulseD 1s infinite 0.4s' }} />
            </div>
          </div>
        )}

        {calls.map((call: any) => (
          <div key={call.id} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>📞 {call.teacherName}</div>
              <div style={{ fontSize: '.8rem', color: '#94a3b8' }}>
                {new Date(call.createdAt).toLocaleTimeString()} · {call.status}
              </div>
            </div>
            {call.status === 'ringing' && (
              <button
                onClick={() => answerCall(call)}
                style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '.9rem' }}
              >
                Answer
              </button>
            )}
          </div>
        ))}
      </main>

      <style>{`
        @keyframes pulseD { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
      `}</style>
    </div>
  );
}
