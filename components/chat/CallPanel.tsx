'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL || 'ws://localhost:8765/ws/signal';

interface Props {
  teacherName: string;
}

type CallState = 'idle' | 'connecting' | 'waiting' | 'ringing' | 'connected' | 'ended';

export function CallPanel({ teacherName }: Props) {
  const [callState, setCallStateInner] = useState<CallState>('idle');
  const [isVideo, setIsVideo] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [duration, setDuration] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteConnected = useRef(false);
  const callStateRef = useRef<CallState>('idle');
  const setState = (s: CallState) => { callStateRef.current = s; setCallStateInner(s); };

  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const startDuration = () => {
    stopDuration();
    durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const stopDuration = () => {
    if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const endCall = useCallback(() => {
    stopDuration();
    setDuration(0);
    remoteConnected.current = false;

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    if (wsRef.current) {
      if (roomId) {
        wsRef.current.send(JSON.stringify({ type: 'end_call', room: roomId }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    // End the call request in DB
    fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', teacherName, roomId, status: 'ended' }),
    }).catch(() => {});
    setState('idle');
    setRoomId('');
  }, [roomId]);

  const startCall = async (video: boolean) => {
    if (callState !== 'idle') return;
    setIsVideo(video);
    callStateRef.current = 'connecting';
    setState('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const ws = new WebSocket(SIGNAL_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', role: 'teacher' }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'joined':
            setRoomId(msg.room);
            setState('waiting');
            // Notify the developer dashboard about this call
            fetch('/api/calls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'request', teacherName, roomId: msg.room }),
            }).catch(() => {});
            break;

          case 'visitor_ready':
          case 'incoming_call':
            setState('ringing');
            await startPeerConnection(ws, msg.room, stream, video);
            break;

          case 'offer':
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              ws.send(JSON.stringify({ type: 'answer', sdp: answer, room: msg.room }));
            }
            break;

          case 'answer':
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }
            break;

          case 'ice_candidate':
            if (pcRef.current && msg.candidate) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
            break;

          case 'peer_disconnected':
            endCall();
            break;
        }
      };

      ws.onclose = () => {
        if (callStateRef.current === 'connecting' || callStateRef.current === 'waiting') {
          setState('idle');
        }
      };

      ws.onerror = () => {
        setState('idle');
      };

    } catch {
      setState('idle');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    }
  };

  const startPeerConnection = async (ws: WebSocket, room: string, stream: MediaStream, video: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(JSON.stringify({ type: 'ice_candidate', candidate: e.candidate, room }));
      }
    };

    pc.ontrack = (e) => {
      remoteConnected.current = true;
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
      setState('connected');
      setDuration(0);
      startDuration();
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', sdp: offer, room }));
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }
  };

  if (callState === 'idle') {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => startCall(false)}
          title="Audio call"
          className="w-[38px] h-[38px] rounded-[10px] border border-white/[0.12] bg-white/[0.06] text-emerald-400 cursor-pointer flex items-center justify-center hover:bg-white/[0.1] hover:border-white/20 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
        <button
          onClick={() => startCall(true)}
          title="Video call"
          className="w-[38px] h-[38px] rounded-[10px] border border-white/[0.12] bg-white/[0.06] text-brand-400 cursor-pointer flex items-center justify-center hover:bg-white/[0.1] hover:border-white/20 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Call overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
      }}>
        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            display: remoteConnected.current ? 'block' : 'none',
          }}
        />

        {/* Connecting / waiting overlay */}
        {!remoteConnected.current && (
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
              boxShadow: '0 0 40px rgba(99,102,241,0.4)',
            }}>
              {teacherName.charAt(0).toUpperCase() || 'T'}
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px' }}>
              {teacherName || 'Teacher'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '.9rem', margin: 0 }}>
              {callState === 'connecting' ? 'Connecting...' :
               callState === 'waiting' ? `Waiting for a visitor to call... (Room: ${roomId})` :
               callState === 'ringing' ? 'Connecting call...' : 'Call ended'}
            </p>
            {callState === 'waiting' && (
              <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1s infinite' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1s infinite 0.2s' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1s infinite 0.4s' }} />
              </div>
            )}
          </div>
        )}

        {/* Connected overlay */}
        {remoteConnected.current && (
          <div style={{
            position: 'absolute', top: 20, left: 20, right: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#34d399', fontSize: '.8rem', fontWeight: 700 }}>● Live</span>
              <span style={{ color: '#94a3b8', fontSize: '.8rem' }}>{fmt(duration)}</span>
            </div>
            <span style={{ color: '#f8fafc', fontSize: '.85rem', fontWeight: 600 }}>{teacherName}</span>
          </div>
        )}

        {/* Local video (PiP) */}
        {isVideo && (
          <video
            ref={localVideoRef}
            autoPlay playsInline muted
            style={{
              position: 'absolute', bottom: 100, right: 20, width: 160, borderRadius: 12,
              zIndex: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              transform: 'scaleX(-1)',
            }}
          />
        )}

        {/* Audio-only local avatar */}
        {!isVideo && localStreamRef.current && (
          <div style={{
            position: 'absolute', bottom: 100, right: 20, zIndex: 2,
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            {teacherName.charAt(0).toUpperCase() || 'T'}
          </div>
        )}

        {/* Controls */}
        <div style={{
          position: 'absolute', bottom: 24, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 16, zIndex: 2,
        }}>
          <button onClick={toggleMute} style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            backdropFilter: 'blur(8px)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          {isVideo && (
            <button onClick={toggleVideo} style={{
              width: 52, height: 52, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              backdropFilter: 'blur(8px)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </button>
          )}
          <button onClick={endCall} style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            background: '#ef4444', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
      `}</style>
    </>
  );
}
