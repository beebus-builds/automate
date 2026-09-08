'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { bookingToIcs } from '@/lib/bookings';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';
import { SkeletonPage } from '@/components/Skeleton';

type Tab = 'sites' | 'inbox' | 'bookings' | 'posts' | 'audience' | 'analytics';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'sites', label: 'My Site', icon: '🌐' },
  { id: 'inbox', label: 'Inbox', icon: '📥' },
  { id: 'bookings', label: 'Bookings', icon: '📅' },
  { id: 'posts', label: 'Blog Posts', icon: '📝' },
  { id: 'audience', label: 'Audience', icon: '💌' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
];

const cardCls = 'rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5';
const btnPrimary = 'px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50';
const btnGhost = 'px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:text-white transition-all disabled:opacity-40';
const inpCls = 'w-full px-3 py-2 bg-surface-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-500 placeholder:text-slate-600';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('sites');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => {
      setAuthChecked(true);
      if (d.user) setUser(d.user);
    }).catch(() => setAuthChecked(true));
  }, []);

  // unread badge (cheap poll while on dashboard)
  useEffect(() => {
    if (!user?.id) return;
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/messages?teacherId=${user.id}`);
        const j = await r.json();
        if (!stop && Array.isArray(j.messages)) setUnread(j.messages.filter((m: any) => !m.read).length);
      } catch {}
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => { stop = true; clearInterval(t); };
  }, [user?.id]);

  if (!authChecked) return <SkeletonPage />;
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-950 text-slate-200 font-sans items-center justify-center p-6">
        <div className="bg-surface-700 border border-white/[0.08] rounded-3xl p-12 max-w-[440px] w-full text-center shadow-2xl">
          <div className="text-[3rem] mb-4">📊</div>
          <h1 className="text-2xl font-black text-white mb-3">Teacher Dashboard</h1>
          <p className="text-sm text-slate-400 mb-8">Inbox, bookings, blog and analytics for your portfolio site.</p>
          <button onClick={() => setIsAuthOpen(true)} className="px-6 py-3.5 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-brand-500/40">Sign In</button>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-slate-200 font-sans">
      <header className="glass-strong border-b border-white/[0.06] px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <Link href="/" className="flex items-center no-underline text-white"><Logo size={28} wordmark /></Link>
        <span className="text-[0.65rem] font-bold uppercase tracking-widest text-brand-300 bg-brand-500/10 border border-brand-500/25 rounded-full px-2.5 py-1">Dashboard</span>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/build" className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-white/10 hover:text-white transition-colors no-underline">💬 Chat</Link>
          <Link href="/studio" className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-brand-200 border border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/20 transition-colors no-underline">🎨 Studio</Link>
          <span className="text-xs font-semibold text-slate-300 hidden md:inline">{user.name}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 flex-wrap mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${tab === t.id ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-white/[0.02] border-white/[0.07] text-slate-400 hover:text-white'}`}>
              <span>{t.icon}</span>{t.label}
              {t.id === 'inbox' && unread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[0.6rem] font-black inline-flex items-center justify-center">{unread}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'sites' && <SitesTab user={user} />}
        {tab === 'inbox' && <InboxTab user={user} onRead={() => setUnread(0)} />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'posts' && <PostsTab />}
        {tab === 'audience' && <AudienceTab />}
        {tab === 'analytics' && <AnalyticsTab user={user} />}
      </div>
    </div>
  );
}

/* ── Sites ── */
function SitesTab({ user }: { user: any }) {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(d => { setContent(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const listed = content?.meta?.directoryListed !== false;
  const toggleDirectory = async () => {
    setBusy(true);
    try {
      const next = { ...(content || {}), meta: { ...((content || {}).meta || {}), directoryListed: !listed } };
      const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      if (!r.ok) throw new Error();
      setContent(next);
      setMsg(listed ? 'Hidden from the public directory.' : 'Listed in the public directory! 🎉');
    } catch {
      setMsg('Save failed — try again.');
    }
    setBusy(false);
  };
  const rebuild = async () => {
    setBusy(true);
    setMsg('Rebuilding…');
    try {
      const r = await fetch('/api/build', { method: 'POST' });
      setMsg(r.ok ? 'Site rebuilt! ✅' : 'Rebuild failed.');
    } catch {
      setMsg('Rebuild failed.');
    }
    setBusy(false);
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  const title = content?.site?.title || `${user.name}'s site`;
  return (
    <div className="flex flex-col gap-4">
      <div className={cardCls}>
        <h2 className="text-base font-extrabold text-white mb-1">{title}</h2>
        <p className="text-xs text-slate-500 mb-4">{content?.hero?.tagline || 'No published content yet — build your site first.'}</p>
        <div className="flex gap-2 flex-wrap">
          <a href={`/s/${user.id}`} target="_blank" rel="noreferrer" className={btnPrimary + ' no-underline'}>🌐 View live site</a>
          <a href={`/api/download?name=${encodeURIComponent(user.name || 'Teacher')}`} className={btnGhost + ' no-underline'}>📦 Download ZIP</a>
          <button onClick={rebuild} disabled={busy} className={btnGhost}>🔨 Rebuild</button>
        </div>
      </div>
      <div className={cardCls}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <h3 className="text-sm font-extrabold text-white mb-1">Share your site</h3>
            <p className="text-xs text-slate-500 mb-3">QR code pointing at your live site — print it for your classroom door.</p>
            <div className="flex gap-2">
              <a href={`/api/qr?teacherId=${user.id}&download=1`} className={btnGhost + ' no-underline'}>⤓ Download QR</a>
              <a href={`/api/qr?teacherId=${user.id}`} target="_blank" rel="noreferrer" className={btnGhost + ' no-underline'}>👁 View</a>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qr?teacherId=${user.id}`} alt="Site QR code" className="w-28 h-28 rounded-xl border border-white/15 bg-white p-1.5" loading="lazy" />
        </div>
      </div>
      <div className={cardCls}>
        <h3 className="text-sm font-extrabold text-white mb-1">Public directory</h3>
        <p className="text-xs text-slate-500 mb-3">Show your portfolio on the community directory page so other teachers can find you.</p>
        <div className="flex items-center gap-3">
          <button onClick={toggleDirectory} disabled={busy}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${listed ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-transparent border-white/10 text-slate-500'}`}>
            {listed ? '✓ Listed' : '○ Hidden'}
          </button>
          {listed && <Link href="/directory" className="text-xs text-brand-300 hover:underline">View directory →</Link>}
        </div>
      </div>
      <div className={cardCls}>
        <h3 className="text-sm font-extrabold text-white mb-1">🤖 Site chat assistant</h3>
        <p className="text-xs text-slate-500 mb-3">When on, visitors get instant AI answers from your content; otherwise messages go straight to your inbox.</p>
        <button onClick={() => setMetaFlag('aiReplies', !(content?.meta?.aiReplies !== false))} disabled={busy}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${content?.meta?.aiReplies !== false ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-transparent border-white/10 text-slate-500'}`}>
          {content?.meta?.aiReplies !== false ? '✓ AI replies on' : '○ AI replies off'}
        </button>
      </div>
      <DomainsCard />
      <NotifyCard />
      {msg && <p className="text-xs text-slate-400">{msg}</p>}
    </div>
  );

  async function setMetaFlag(key: string, value: boolean) {
    setBusy(true);
    try {
      const next = { ...(content || {}), meta: { ...((content || {}).meta || {}), [key]: value } };
      const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      if (!r.ok) throw new Error();
      setContent(next);
    } catch {
      setMsg('Save failed — try again.');
    }
    setBusy(false);
  }
}

/* ── Custom domains ── */
function DomainsCard() {
  const [domains, setDomains] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    fetch('/api/domains').then(r => r.json()).then(j => {
      if (Array.isArray(j.domains)) setDomains(j.domains);
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!input.trim()) return;
    setBusy(true);
    setMsg('');
    setInfo(null);
    try {
      const r = await fetch('/api/domains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: input.trim() }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'add failed');
      setInput('');
      setInfo(j.verification?.length ? { domain: j.domain.domain, verification: j.verification } : null);
      setMsg(j.verified ? 'Domain live! 🎉' : 'Added — point your DNS, then verify below.');
      load();
    } catch (e: any) {
      setMsg(e.message || 'Add failed.');
    }
    setBusy(false);
  };
  const verify = async (id: number) => {
    setBusy(true);
    try {
      const r = await fetch('/api/domains', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'verify failed');
      if (j.verified) setMsg('Domain verified! 🎉');
      else {
        setMsg('Not verified yet — check DNS, then retry.');
        if (j.verification?.length) setInfo({ domain: domains.find(d => d.id === id)?.domain, verification: j.verification });
      }
      load();
    } catch (e: any) {
      setMsg(e.message || 'Verify failed.');
    }
    setBusy(false);
  };
  const remove = async (id: number) => {
    if (!window.confirm('Remove this domain?')) return;
    await fetch(`/api/domains?id=${id}`, { method: 'DELETE' }).catch(() => {});
    load();
  };

  return (
    <div className={cardCls}>
      <h3 className="text-sm font-extrabold text-white mb-1">🔗 Custom domain</h3>
      <p className="text-xs text-slate-500 mb-3">Attach your own domain to the Vercel deployment (deploy at least once first).</p>
      <div className="flex gap-2 mb-3">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} placeholder="you.example.com" className={inpCls} />
        <button onClick={add} disabled={busy || !input.trim()} className={btnPrimary}>Add</button>
      </div>
      {domains.length === 0 && <p className="text-xs text-slate-600">No custom domains yet.</p>}
      <div className="flex flex-col gap-2">
        {domains.map(d => (
          <div key={d.id} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
            <span className="text-xs font-bold text-slate-200 truncate flex-1">{d.domain}</span>
            <span className={`text-[0.6rem] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${d.verified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
              {d.verified ? 'live' : 'pending'}
            </span>
            {!d.verified && <button onClick={() => verify(d.id)} disabled={busy} className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold bg-brand-500/15 border border-brand-500/40 text-brand-200">Verify</button>}
            <button onClick={() => remove(d.id)} className="text-slate-600 hover:text-red-300 text-xs px-1" title="Remove">✕</button>
          </div>
        ))}
      </div>
      {info && (
        <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
          <p className="text-[0.68rem] font-bold text-amber-200 mb-1.5">DNS for {info.domain} — add one of these, then Verify:</p>
          <p className="text-[0.68rem] text-slate-400 mb-1.5">Apex domain → A record @ → 76.76.21.21 · Subdomain → CNAME → cname.vercel-dns.com</p>
          {(info.verification || []).map((v: any, i: number) => (
            <p key={i} className="text-[0.65rem] font-mono text-slate-300 break-all">{v.type} {v.domain} → {v.value}</p>
          ))}
        </div>
      )}
      {msg && <p className="text-xs text-slate-400 mt-2">{msg}</p>}
    </div>
  );
}

/* ── Email notification settings ── */
function NotifyCard() {
  const [s, setS] = useState<any>(null);
  const [resendKey, setResendKey] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(j => {
      if (!j.error) setS(j);
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    setMsg('');
    try {
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notify_email: s.notifyEmail || '',
          notify_on_message: !!s.notifyOnMessage,
          notify_on_booking: !!s.notifyOnBooking,
          mail_provider: s.provider || '',
          mail_from: s.from || '',
          ...(resendKey ? { resend_key: resendKey } : {}),
          smtp_host: s.smtpHost || '',
          smtp_port: s.smtpPort || 587,
          smtp_user: s.smtpUser || '',
          ...(smtpPass ? { smtp_pass: smtpPass } : {}),
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'save failed');
      setS({ ...s, ...j, hasResendKey: resendKey ? true : s.hasResendKey, hasSmtpPass: smtpPass ? true : s.hasSmtpPass });
      setResendKey('');
      setSmtpPass('');
      setMsg(j.configured ? 'Notifications on! ✅' : 'Saved. Add a mail provider + address to switch alerts on.');
    } catch (e: any) {
      setMsg(e.message || 'Save failed.');
    }
    setSaving(false);
  };

  if (!s) return null;
  const set = (patch: any) => setS((p: any) => ({ ...p, ...patch }));
  return (
    <div className={cardCls}>
      <h3 className="text-sm font-extrabold text-white mb-1">🔔 Email alerts {s.configured && <span className="text-emerald-300">· on</span>}</h3>
      <p className="text-xs text-slate-500 mb-3">Get emailed about new inbox messages and booking requests.</p>
      <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
        <div>
          <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Alert address</label>
          <input value={s.notifyEmail || ''} onChange={e => set({ notifyEmail: e.target.value })} placeholder="you@school.edu" className={inpCls} />
        </div>
        <div>
          <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Provider</label>
          <select value={s.provider || ''} onChange={e => set({ provider: e.target.value })} className={inpCls}>
            <option value="">Off</option>
            <option value="resend">Resend (API key)</option>
            <option value="smtp">SMTP (any host)</option>
          </select>
        </div>
      </div>
      {s.provider === 'resend' && (
        <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Resend key {s.hasResendKey && '(saved ✓)'}</label>
            <input value={resendKey} onChange={e => setResendKey(e.target.value)} placeholder={s.hasResendKey ? '•••••• (blank = keep)' : 're_…'} className={inpCls} />
          </div>
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">From address</label>
            <input value={s.from || ''} onChange={e => set({ from: e.target.value })} placeholder="TeacherFolio <noreply@…>" className={inpCls} />
          </div>
        </div>
      )}
      {s.provider === 'smtp' && (
        <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">SMTP host</label>
            <input value={s.smtpHost || ''} onChange={e => set({ smtpHost: e.target.value })} placeholder="smtp.gmail.com" className={inpCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Port</label>
              <input type="number" value={s.smtpPort || 587} onChange={e => set({ smtpPort: parseInt(e.target.value, 10) || 587 })} className={inpCls} />
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Username</label>
              <input value={s.smtpUser || ''} onChange={e => set({ smtpUser: e.target.value })} className={inpCls} />
            </div>
          </div>
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Password {s.hasSmtpPass && '(saved ✓)'}</label>
            <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder={s.hasSmtpPass ? '•••••• (blank = keep)' : ''} className={inpCls} />
          </div>
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">From address</label>
            <input value={s.from || ''} onChange={e => set({ from: e.target.value })} placeholder="you@school.edu" className={inpCls} />
          </div>
        </div>
      )}
      <div className="flex gap-2 flex-wrap mb-3">
        <button onClick={() => set({ notifyOnMessage: !s.notifyOnMessage })}
          className={`px-3 py-1.5 rounded-lg text-[0.65rem] font-bold border ${s.notifyOnMessage ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-500'}`}>
          {s.notifyOnMessage ? '✓' : '○'} New messages
        </button>
        <button onClick={() => set({ notifyOnBooking: !s.notifyOnBooking })}
          className={`px-3 py-1.5 rounded-lg text-[0.65rem] font-bold border ${s.notifyOnBooking ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-500'}`}>
          {s.notifyOnBooking ? '✓' : '○'} New bookings
        </button>
        <button onClick={save} disabled={saving} className={btnPrimary + ' ml-auto'}>{saving ? 'Saving…' : '💾 Save alerts'}</button>
      </div>
      {msg && <p className="text-xs text-slate-400">{msg}</p>}
    </div>
  );
}

/* ── Inbox ── */
function InboxTab({ user, onRead }: { user: any; onRead: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/messages?teacherId=${user.id}`)
      .then(r => r.json())
      .then(j => { setMessages(Array.isArray(j.messages) ? j.messages.reverse() : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.id]);

  const markAllRead = async () => {
    const ids = messages.filter(m => !m.read).map(m => m.id);
    if (!ids.length) return;
    await fetch('/api/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, read: true }) }).catch(() => {});
    setMessages(p => p.map(m => ({ ...m, read: 1 })));
    onRead();
  };
  const remove = async (id: number) => {
    if (!window.confirm('Delete this message?')) return;
    const r = await fetch(`/api/messages?id=${id}`, { method: 'DELETE' });
    if (r.ok) setMessages(p => p.filter(m => m.id !== id));
  };

  if (loading) return <p className="text-sm text-slate-500">Loading inbox…</p>;
  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-extrabold text-white">📥 Visitor messages</h2>
        <span className="text-[0.65rem] text-slate-500">{messages.length} total</span>
        <button onClick={markAllRead} className="ml-auto px-3 py-1.5 rounded-lg text-[0.65rem] font-bold text-slate-400 border border-white/10 hover:text-white">Mark all read</button>
      </div>
      {messages.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-xs text-slate-500">No messages yet. Messages sent from your live site&rsquo;s chat widget land here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {messages.map(m => (
            <div key={m.id} className={`rounded-xl border p-3.5 ${m.read ? 'border-white/[0.06] bg-white/[0.015]' : 'border-brand-500/30 bg-brand-500/[0.05]'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-200">{m.sender || 'visitor'}</span>
                {!m.read && <span className="text-[0.58rem] font-black uppercase tracking-wider text-brand-300 bg-brand-500/15 rounded-full px-2 py-0.5">new</span>}
                <span className="ml-auto text-[0.62rem] text-slate-600">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</span>
                <button onClick={() => remove(m.id)} className="text-slate-600 hover:text-red-300 text-xs px-1" title="Delete">🗑</button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Bookings ── */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function BookingsTab() {
  const [slots, setSlots] = useState<{ weekday: number; start: string; end: string }[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/bookings')
      .then(r => r.json())
      .then(j => {
        setSlots(Array.isArray(j.slots) ? j.slots : []);
        setBookings(Array.isArray(j.bookings) ? j.bookings : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveSlots = async () => {
    setSaving(true);
    setMsg('');
    try {
      const r = await fetch('/api/slots', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slots }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'save failed');
      setMsg('Availability saved! ✅ Add a 📅 Booking Form widget in Studio to take requests.');
    } catch (e: any) {
      setMsg(e.message || 'Save failed.');
    }
    setSaving(false);
  };

  const setStatus = async (id: number, status: string) => {
    const r = await fetch('/api/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    if (r.ok) setBookings(p => p.map(b => (b.id === id ? { ...b, status } : b)));
  };
  const downloadIcs = (b: any) => {
    const ics = bookingToIcs({ date: b.date, time: b.time, name: b.name, email: b.email, note: b.note }, 'Teacher');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${b.date}-${b.time.replace(':', '')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const remove = async (id: number) => {
    if (!window.confirm('Delete this booking?')) return;
    const r = await fetch(`/api/bookings?id=${id}`, { method: 'DELETE' });
    if (r.ok) setBookings(p => p.filter(b => b.id !== id));
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(b => b.date >= today && b.status !== 'cancelled');
  const past = bookings.filter(b => b.date < today || b.status === 'cancelled');

  if (loading) return <p className="text-sm text-slate-500">Loading bookings…</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className={cardCls}>
        <h2 className="text-base font-extrabold text-white mb-1">🕒 Weekly availability</h2>
        <p className="text-xs text-slate-500 mb-4">Visitors can only request times inside these windows.</p>
        <div className="flex flex-col gap-2 mb-4">
          {slots.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={s.weekday} onChange={e => setSlots(p => p.map((x, j) => (j === i ? { ...x, weekday: parseInt(e.target.value, 10) } : x)))} className="px-2.5 py-2 bg-surface-800 border border-white/10 rounded-lg text-white text-xs outline-none">
                {DAYS.map((d, di) => <option key={di} value={di}>{d}</option>)}
              </select>
              <input type="time" value={s.start} onChange={e => setSlots(p => p.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} className="px-2.5 py-2 bg-surface-800 border border-white/10 rounded-lg text-white text-xs outline-none" />
              <span className="text-slate-600 text-xs">→</span>
              <input type="time" value={s.end} onChange={e => setSlots(p => p.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} className="px-2.5 py-2 bg-surface-800 border border-white/10 rounded-lg text-white text-xs outline-none" />
              <button onClick={() => setSlots(p => p.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-300 px-1" title="Remove">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSlots(p => [...p, { weekday: 1, start: '15:00', end: '17:00' }])} className={btnGhost}>+ Add window</button>
          <button onClick={saveSlots} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : '💾 Save availability'}</button>
        </div>
        {msg && <p className="text-xs text-slate-400 mt-3">{msg}</p>}
      </div>

      <div className={cardCls}>
        <h2 className="text-base font-extrabold text-white mb-4">📬 Requests ({upcoming.length} upcoming)</h2>
        {upcoming.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No upcoming requests. Share your site and they will appear here.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map(b => (
              <div key={b.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{b.name}</span>
                  <span className={`text-[0.6rem] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${b.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{b.status}</span>
                  <span className="ml-auto text-xs text-slate-400">📅 {b.date} · 🕒 {b.time}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{b.email}{b.note ? ` · “${b.note}”` : ''}</p>
                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                  {b.status !== 'confirmed' && <button onClick={() => setStatus(b.id, 'confirmed')} className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30">✓ Confirm</button>}
                  {b.status !== 'cancelled' && <button onClick={() => setStatus(b.id, 'cancelled')} className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white">Cancel</button>}
                  <button onClick={() => downloadIcs(b)} className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white">📅 .ics</button>
                  <button onClick={() => remove(b.id)} className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold text-slate-600 hover:text-red-300">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">Past & cancelled ({past.length})</summary>
            <div className="flex flex-col gap-2 mt-2">
              {past.map(b => (
                <div key={b.id} className="rounded-xl border border-white/[0.05] p-3 text-xs text-slate-500 flex items-center gap-2">
                  <span className="font-bold text-slate-400">{b.name}</span>
                  <span>{b.date} · {b.time} · {b.status}</span>
                  <button onClick={() => remove(b.id)} className="ml-auto hover:text-red-300">🗑</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/* ── Posts ── */
function PostsTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cover, setCover] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadPosts = useCallback(async () => {
    try {
      const r = await fetch('/api/posts');
      const j = await r.json();
      setPosts(Array.isArray(j.posts) ? j.posts : []);
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(j => { setPosts(Array.isArray(j.posts) ? j.posts : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const startNew = () => { setEditing({ id: null }); setTitle(''); setBody(''); setCover(''); setPublished(false); setMsg(''); };
  const startEdit = (p: any) => { setEditing(p); setTitle(p.title || ''); setBody(p.body || ''); setCover(p.cover || ''); setPublished(!!p.published); setMsg(''); };

  const save = async () => {
    if (!title.trim()) { setMsg('Title is required.'); return; }
    setSaving(true);
    setMsg('');
    try {
      const payload = { id: editing?.id, title: title.trim(), body, cover: cover.trim(), published };
      const r = await fetch('/api/posts', { method: editing?.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'save failed');
      await loadPosts();
      setEditing(j.post);
      setMsg('Saved! Rebuild your site to publish it live. 👇');
    } catch (e: any) {
      setMsg(e.message || 'Save failed.');
    }
    setSaving(false);
  };
  const remove = async (id: number) => {
    if (!window.confirm('Delete this post?')) return;
    const r = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      if (editing?.id === id) { setEditing(null); setTitle(''); setBody(''); setCover(''); }
      await loadPosts();
    }
  };
  const rebuild = async () => {
    setMsg('Rebuilding site…');
    const r = await fetch('/api/build', { method: 'POST' });
    setMsg(r.ok ? 'Site rebuilt with your blog! ✅' : 'Rebuild failed.');
  };
  const uploadCover = async (f: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await fetch('/api/media', { method: 'POST', body: fd });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.url) setCover(j.url);
    } catch {}
    setUploading(false);
  };

  if (loading) return <p className="text-sm text-slate-500">Loading posts…</p>;
  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4 items-start">
      <div className={cardCls}>
        <div className="flex items-center mb-3">
          <h2 className="text-sm font-extrabold text-white">Posts ({posts.length})</h2>
          <button onClick={startNew} className="ml-auto px-3 py-1.5 rounded-lg text-[0.65rem] font-bold bg-brand-500/15 border border-brand-500/40 text-brand-200">+ New</button>
        </div>
        {posts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No posts yet.<br />Write your first article →</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {posts.map(p => (
              <button key={p.id} onClick={() => startEdit(p)}
                className={`text-left rounded-xl border p-2.5 transition-all ${editing?.id === p.id ? 'bg-brand-500/10 border-brand-500/40' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20'}`}>
                <span className="block text-xs font-bold text-slate-200 truncate">{p.title || 'Untitled'}</span>
                <span className="text-[0.62rem] text-slate-500">{p.published ? '🟢 Published' : '⚪ Draft'} · {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={rebuild} className={btnGhost + ' w-full mt-3'}>🔨 Rebuild site (publish blog)</button>
      </div>

      <div className={cardCls}>
        {!editing ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-xs text-slate-500">Select a post or start a new one.<br />Published posts get their own page + a Blog section automatically.</p>
          </div>
        ) : (
          <>
            <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="My first classroom story" className={inpCls + ' mb-3'} />
            <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Cover image</label>
            <div className="flex gap-2 mb-3">
              <input value={cover} onChange={e => setCover(e.target.value)} placeholder="https://… or upload" className={inpCls} />
              <label className="px-3 py-2 rounded-xl text-xs bg-white/[0.05] border border-white/10 hover:border-white/30 cursor-pointer flex-shrink-0">
                {uploading ? '…' : '📤'}
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadCover(f); }} />
              </label>
            </div>
            {cover && <img src={cover} alt="" className="rounded-xl mb-3 max-h-36 w-full object-cover border border-white/10" />}
            <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Body (blank line = new paragraph)</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} placeholder="Write your story…" className={inpCls + ' mb-3 leading-relaxed'} />
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setPublished(v => !v)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${published ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-transparent border-white/10 text-slate-500'}`}>
                {published ? '🟢 Published' : '⚪ Draft'}
              </button>
              <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : '💾 Save post'}</button>
              {editing?.id && <button onClick={() => remove(editing.id)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-red-300">Delete</button>}
            </div>
            {msg && <p className="text-xs text-slate-400 mt-3">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Audience (newsletter subscribers + comment moderation) ── */
function AudienceTab() {
  const [subs, setSubs] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [bcSubject, setBcSubject] = useState('');
  const [bcText, setBcText] = useState('');
  const [bcBusy, setBcBusy] = useState(false);
  const [bcResult, setBcResult] = useState('');

  const loadTestimonials = useCallback(() => {
    fetch('/api/testimonials').then(r => r.json()).then(j => {
      if (Array.isArray(j.testimonials)) setTestimonials(j.testimonials);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/newsletter').then(r => r.json()).catch(() => null),
      fetch('/api/posts').then(r => r.json()).catch(() => null),
    ]).then(async ([n, p]) => {
      setSubs(Array.isArray(n?.subscribers) ? n.subscribers : []);
      // gather pending comments across posts
      const posts = Array.isArray(p?.posts) ? p.posts : [];
      const all: any[] = [];
      for (const post of posts.slice(0, 30)) {
        try {
          const r = await fetch(`/api/comments?teacherId=${post.teacher_id}&slug=${encodeURIComponent(post.slug)}`);
          const j = await r.json();
          if (Array.isArray(j.comments)) all.push(...j.comments.map((c: any) => ({ ...c, postTitle: post.title })));
        } catch {}
      }
      all.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      setComments(all);
      setLoading(false);
    }).catch(() => setLoading(false));
    loadTestimonials();
  }, [loadTestimonials]);

  const removeSub = async (id: number) => {
    const r = await fetch(`/api/newsletter?id=${id}`, { method: 'DELETE' });
    if (r.ok) setSubs(s => s.filter(x => x.id !== id));
  };
  const exportCsv = () => {
    const csv = 'email,subscribed_at\n' + subs.map(s => `"${String(s.email).replace(/"/g, '""')}","${s.created_at || ''}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const moderate = async (id: number, status: string) => {
    const r = await fetch('/api/comments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    if (r.ok) setComments(cs => cs.map(c => (c.id === id ? { ...c, status } : c)));
  };
  const deleteComment = async (id: number) => {
    if (!window.confirm('Delete this comment?')) return;
    const r = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
    if (r.ok) setComments(cs => cs.filter(c => c.id !== id));
  };

  const pending = comments.filter(c => c.status !== 'approved');
  const sendBroadcast = async () => {
    if (!bcSubject.trim() || !bcText.trim()) { setBcResult('Subject and message required.'); return; }
    setBcBusy(true);
    setBcResult('');
    try {
      const r = await fetch('/api/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: bcSubject.trim(), text: bcText.trim() }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'send failed');
      setBcResult(`Sent to ${j.sent}/${j.total} subscribers${j.failed ? ` (${j.failed} failed)` : ''}. 🎉`);
      setBcSubject('');
      setBcText('');
    } catch (e: any) {
      setBcResult(e.message || 'Send failed.');
    }
    setBcBusy(false);
  };

  const moderateTestimonial = async (id: number, status: string) => {
    const r = await fetch('/api/testimonials', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    if (r.ok) setTestimonials(ts => ts.map(t => (t.id === id ? { ...t, status } : t)));
  };
  const deleteTestimonial = async (id: number) => {
    if (!window.confirm('Delete this testimonial?')) return;
    const r = await fetch(`/api/testimonials?id=${id}`, { method: 'DELETE' });
    if (r.ok) setTestimonials(ts => ts.filter(t => t.id !== id));
  };
  const addApprovedToSite = async () => {
    const approved = testimonials.filter(t => t.status === 'approved');
    if (!approved.length) { setMsg('Approve at least one testimonial first.'); return; }
    setMsg('Adding to your site…');
    try {
      const r = await fetch('/api/data');
      const content = await r.json();
      const customs = Array.isArray(content.customSections) ? [...content.customSections] : [];
      let target = customs.find((s: any) => /testimonial/i.test(s.title || ''));
      const existingTexts = new Set<string>();
      if (target) (target.blocks || []).forEach((b: any) => { if (b.type === 'quote' && b.text) existingTexts.add(String(b.text).slice(0, 60)); });
      const fresh = approved.filter(t => !existingTexts.has(String(t.text || '').slice(0, 60)));
      if (!fresh.length) { setMsg('All approved testimonials are already on your site.'); return; }
      const blocks = fresh.map((t: any, i: number) => ({
        id: `blk-q-${Date.now().toString(36)}-${i}`,
        type: 'quote',
        text: t.text,
        attribution: `— ${t.name}${t.context ? `, ${t.context}` : ''}`,
      }));
      if (target) {
        target = { ...target, blocks: [...(target.blocks || []), ...blocks] };
        const idx = customs.findIndex((s: any) => s.id === target.id);
        customs[idx] = target;
      } else {
        const sec = {
          id: `sec-testi-${Date.now().toString(36)}`,
          title: 'Student Testimonials',
          badge: 'Testimonials',
          subtitle: 'What learners say about my teaching.',
          showHeader: true,
          layout: 'three',
          bg: '#111827',
          bgStyle: 'alt',
          pattern: 'dots',
          padding: 'normal',
          radius: 'rounded',
          align: 'left',
          maxWidth: 'normal',
          blocks,
        };
        customs.push(sec);
        const order = Array.isArray(content?.layout?.sections) ? [...content.layout.sections] : null;
        if (order) {
          content.layout = { ...content.layout, sections: [...order, { type: 'custom', id: sec.id, variant: 'default' }] };
        }
      }
      const put = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...content, customSections: customs }) });
      if (!put.ok) throw new Error();
      setMsg(`Added ${fresh.length} testimonial${fresh.length > 1 ? 's' : ''}! Rebuild (My Site tab) to publish. ✅`);
    } catch {
      setMsg('Add failed — try again.');
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading audience…</p>;
  const pendingTesti = testimonials.filter(t => t.status !== 'approved');
  return (
    <div className="flex flex-col gap-4">
      <div className={cardCls}>
        <h2 className="text-base font-extrabold text-white mb-1">📣 Broadcast email</h2>
        <p className="text-xs text-slate-500 mb-3">Write once, reach all {subs.length} subscriber{subs.length === 1 ? '' : 's'} (uses your mail setup).</p>
        <input value={bcSubject} onChange={e => setBcSubject(e.target.value)} placeholder="Subject" className={inpCls + ' mb-2'} />
        <textarea value={bcText} onChange={e => setBcText(e.target.value)} rows={4} placeholder="Hello everyone,…" className={inpCls + ' mb-2 leading-relaxed'} />
        <button onClick={sendBroadcast} disabled={bcBusy || !subs.length} className={btnPrimary}>{bcBusy ? 'Sending…' : `📨 Send to ${subs.length}`}</button>
        {bcResult && <p className="text-xs text-slate-400 mt-2">{bcResult}</p>}
      </div>
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-extrabold text-white">⭐ Testimonials {pendingTesti.length > 0 && <span className="text-amber-300">({pendingTesti.length} to review)</span>}</h2>
          <button onClick={addApprovedToSite} className="ml-auto px-3 py-1.5 rounded-lg text-[0.65rem] font-bold bg-brand-500/15 border border-brand-500/40 text-brand-200">+ Add approved to site</button>
        </div>
        <p className="text-xs text-slate-500 mb-3">From your ✍️ Review Form widget. Approved ones can join your Testimonials section in one click.</p>
        {testimonials.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No testimonials yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {testimonials.map(t => (
              <div key={t.id} className={`rounded-xl border p-3 ${t.status === 'approved' ? 'border-white/[0.06] bg-white/[0.015]' : 'border-amber-500/30 bg-amber-500/[0.05]'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-200">{t.name}</span>
                  {t.context && <span className="text-[0.62rem] text-slate-500">{t.context}</span>}
                  <span className={`text-[0.58rem] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${t.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{t.status}</span>
                  <span className="ml-auto flex gap-1.5">
                    {t.status !== 'approved'
                      ? <button onClick={() => moderateTestimonial(t.id, 'approved')} className="px-2.5 py-1 rounded-lg text-[0.62rem] font-bold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300">Approve</button>
                      : <button onClick={() => moderateTestimonial(t.id, 'pending')} className="px-2.5 py-1 rounded-lg text-[0.62rem] font-bold bg-white/[0.04] border border-white/10 text-slate-400">Unapprove</button>}
                    <button onClick={() => deleteTestimonial(t.id)} className="text-slate-600 hover:text-red-300 text-xs px-1">🗑</button>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 whitespace-pre-wrap">“{t.text}”</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-extrabold text-white">💌 Subscribers ({subs.length})</h2>
          {subs.length > 0 && <button onClick={exportCsv} className="ml-auto px-3 py-1.5 rounded-lg text-[0.65rem] font-bold text-slate-300 bg-white/[0.04] border border-white/10 hover:border-white/30">⤓ Export CSV</button>}
        </div>
        {subs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No subscribers yet. Add a ✉️ Newsletter widget in Studio to start collecting.</p>
        ) : (
          <div className="flex flex-col max-h-64 overflow-y-auto">
            {subs.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] text-sm">
                <span className="text-slate-300 truncate flex-1">{s.email}</span>
                <span className="text-[0.62rem] text-slate-600">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
                <button onClick={() => removeSub(s.id)} className="text-slate-600 hover:text-red-300 text-xs px-1">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cardCls}>
        <h2 className="text-base font-extrabold text-white mb-1">💬 Comments {pending.length > 0 && <span className="text-amber-300">({pending.length} to review)</span>}</h2>
        <p className="text-xs text-slate-500 mb-3">Approve comments, then Rebuild (My Site tab) to show them on your posts.</p>
        {comments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No comments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {comments.map(c => (
              <div key={c.id} className={`rounded-xl border p-3 ${c.status === 'approved' ? 'border-white/[0.06] bg-white/[0.015]' : 'border-amber-500/30 bg-amber-500/[0.05]'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-200">{c.name}</span>
                  <span className="text-[0.62rem] text-slate-500">on “{(c.postTitle || c.post_slug || '').slice(0, 40)}”</span>
                  <span className={`text-[0.58rem] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${c.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{c.status}</span>
                  <span className="ml-auto flex gap-1.5">
                    {c.status !== 'approved'
                      ? <button onClick={() => moderate(c.id, 'approved')} className="px-2.5 py-1 rounded-lg text-[0.62rem] font-bold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300">Approve</button>
                      : <button onClick={() => moderate(c.id, 'pending')} className="px-2.5 py-1 rounded-lg text-[0.62rem] font-bold bg-white/[0.04] border border-white/10 text-slate-400">Unapprove</button>}
                    <button onClick={() => deleteComment(c.id)} className="text-slate-600 hover:text-red-300 text-xs px-1">🗑</button>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
          </div>
        )}
        {msg && <p className="text-xs text-slate-400 mt-2">{msg}</p>}
      </div>
    </div>
  );
}

/* ── Analytics ── */
function AnalyticsTab({ user }: { user: any }) {
  const [stats, setStats] = useState<{ total: number; byPath: { path: string; count: number }[]; byDay: { day: string; count: number }[] } | null>(null);
  const [days, setDays] = useState<{ day: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/views?teacherId=${user.id}&days=30`)
      .then(r => r.json())
      .then(j => {
        if (typeof j.total !== 'number') return;
        setStats(j);
        // last 14 days, fill gaps (computed on arrival, not during render)
        const out: { day: string; count: number }[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
          out.push({ day: d, count: (j.byDay || []).find((x: any) => x.day === d)?.count || 0 });
        }
        setDays(out);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <p className="text-sm text-slate-500">Loading analytics…</p>;
  if (!stats) return <p className="text-sm text-slate-500">Could not load stats.</p>;
  const max = Math.max(1, ...stats.byDay.map(d => d.count));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className={cardCls + ' text-center'}>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <div className="text-[0.65rem] text-slate-500 font-bold uppercase tracking-wider">Views · 30d</div>
        </div>
        <div className={cardCls + ' text-center'}>
          <div className="text-2xl font-black text-white">{stats.byPath.length}</div>
          <div className="text-[0.65rem] text-slate-500 font-bold uppercase tracking-wider">Pages visited</div>
        </div>
        <div className={cardCls + ' text-center'}>
          <div className="text-2xl font-black text-white">{days.reduce((s, d) => s + d.count, 0)}</div>
          <div className="text-[0.65rem] text-slate-500 font-bold uppercase tracking-wider">Views · 14d</div>
        </div>
      </div>
      <div className={cardCls}>
        <h3 className="text-sm font-extrabold text-white mb-4">Daily views · last 14 days</h3>
        {stats.total === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No visits yet — share your live site link to get traffic.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {days.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.day}: ${d.count}`}>
                <div className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-purple-400 transition-all" style={{ height: `${Math.max(3, (d.count / max) * 100)}%` }} />
                <span className="text-[0.55rem] text-slate-600">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {stats.byPath.length > 0 && (
        <div className={cardCls}>
          <h3 className="text-sm font-extrabold text-white mb-3">Top pages</h3>
          <div className="flex flex-col">
            {stats.byPath.slice(0, 10).map(p => (
              <div key={p.path} className="flex items-center gap-3 py-2 border-b border-white/[0.04] text-sm">
                <span className="font-mono text-xs text-brand-300 truncate flex-1">{p.path}</span>
                <span className="text-xs font-bold text-white">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
