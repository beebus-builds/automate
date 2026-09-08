'use client';

import { useState, useEffect, useMemo, useRef, type DragEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';
import { SkeletonPage } from '@/components/Skeleton';
import { emptyData, type TeacherData } from '@/lib/conversation';
import { getAllThemes, searchThemes } from '@/lib/themes';
import {
  BLOCK_META, LAYOUT_META, newBlock, makeId, renderSection,
  type CustomSection, type SectionBlock, type BlockType,
} from '@/lib/sections';
import { SECTION_TEMPLATES } from '@/lib/sectionTemplates';
import { teacherDataToContent, defaultLayoutSections, type LayoutSectionConfig } from '@/lib/sitePayload';
import { FONT_PAIRS } from '@/lib/assistant/fonts';
import { runAssistant, type AssistantMemory } from '@/lib/assistant/engine';
import {
  histPush, histUndo, histRedo, canUndo as histCanUndo, canRedo as histCanRedo,
  sanitizeImportedPage, buildExportDoc, type HistState,
} from '@/lib/studioUtils';
import { auditSite } from '@/lib/audit';

const allThemes = getAllThemes();

const CORE_META: { type: string; label: string; icon: string }[] = [
  { type: 'hero', label: 'Hero', icon: '🦸' },
  { type: 'about', label: 'About', icon: '👤' },
  { type: 'courses', label: 'Courses', icon: '📖' },
  { type: 'philosophy', label: 'Philosophy', icon: '💡' },
  { type: 'achievements', label: 'Achievements', icon: '🏆' },
  { type: 'contact', label: 'Contact', icon: '📧' },
];

type Sel =
  | { kind: 'core'; ctype: string }
  | { kind: 'section'; id: string }
  | { kind: 'block'; sectionId: string; blockId: string }
  | null;

const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inpCls = 'w-full px-3 py-2 bg-surface-800 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500 placeholder:text-slate-600';

export default function StudioPage() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [data, setData] = useState<TeacherData>(emptyData);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatMemory, setChatMemory] = useState<any>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'done' | 'error'>('idle');
  const [publishMsg, setPublishMsg] = useState('');
  const [leftTab, setLeftTab] = useState<'blocks' | 'sections' | 'media' | 'theme' | 'design'>('blocks');
  const [sel, setSel] = useState<Sel>(null);
  const [themeSearch, setThemeSearch] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inspectorUploadRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const pendingImgTarget = useRef<{ sectionId: string; blockId: string } | 'photo' | null>(null);
  // ── undo / redo ──
  const histRef = useRef<HistState>({ past: [], future: [] });
  const lastPushedRef = useRef<string>('');
  const [histTick, setHistTick] = useState(0);
  // ── responsive canvas / panels / AI / revisions ──
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [layersOpen, setLayersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMemory, setAiMemory] = useState<AssistantMemory>({ themeIds: [], themeIndex: 0 });
  const [copiedTick, setCopiedTick] = useState(0);
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Builder → Chat sync: broadcast TeacherData to Build page (BroadcastChannel + localStorage fallback) ──
  const studioSyncRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    try {
      studioSyncRef.current = new BroadcastChannel('tf-studio-sync');
      // Also listen for Build → Studio updates so chat changes flow back
      studioSyncRef.current.onmessage = (e: any) => {
        if (e.data?.type === 'chat-update' && e.data?.data) {
          const incoming = e.data.data as TeacherData;
          setData(prev => ({ ...prev, ...incoming, customSections: incoming.customSections ?? (prev as any).customSections, layoutSections: (incoming as any).layoutSections ?? (prev as any).layoutSections, theme: (incoming as any).theme ?? (prev as any).theme, style: (incoming as any).style ?? (prev as any).style, photo: (incoming as any).photo ?? (prev as any).photo, gallery: (incoming as any).gallery ?? (prev as any).gallery }));
        }
      };
    } catch {}
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'tf-chat-sync' && ev.newValue) {
        try {
          const parsed = JSON.parse(ev.newValue);
          if (parsed?.data) {
            const incoming = parsed.data as TeacherData;
            setData(prev => ({ ...prev, ...incoming, customSections: incoming.customSections ?? (prev as any).customSections, layoutSections: (incoming as any).layoutSections ?? (prev as any).layoutSections, theme: (incoming as any).theme ?? (prev as any).theme, style: (incoming as any).style ?? (prev as any).style, photo: (incoming as any).photo ?? (prev as any).photo, gallery: (incoming as any).gallery ?? (prev as any).gallery }));
          }
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => { try { studioSyncRef.current?.close(); } catch {}; window.removeEventListener('storage', onStorage); };
  }, []);

  const notifyStudioUpdate = (next: TeacherData) => {
    try {
      studioSyncRef.current?.postMessage({ type: 'studio-update', data: next, ts: Date.now() });
      localStorage.setItem('tf-studio-sync', JSON.stringify({ ts: Date.now(), data: next }));
    } catch {}
  };

  // Debounced broadcast so Build preview follows Studio live (without spamming)
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => notifyStudioUpdate(data), 600);
    return () => clearTimeout(t);
  }, [data, loaded]);

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(async (d) => {
        setAuthChecked(true);
        if (d.user) {
          setUser(d.user);
          try {
            const cr = await fetch('/api/chat');
            const cd = await cr.json();
            if (cd.state?.data) setData({ ...emptyData, gallery: [], ...cd.state.data });
            if (cd.state?.messages) setChatMessages(cd.state.messages);
            if (cd.state?.memory) setChatMemory(cd.state.memory);
          } catch {}
          setLoaded(true);
        }
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const refreshMedia = async () => {
    setMediaLoading(true);
    try {
      const r = await fetch('/api/media?limit=60&page=1');
      const list = await r.json();
      setMedia(Array.isArray(list) ? list : []);
    } catch {}
    setMediaLoading(false);
  };
  useEffect(() => { if (user) void refreshMedia(); }, [user]);

  const theme = useMemo(() => allThemes.find(t => t.id === data.theme) || allThemes[0], [data.theme]);
  const c = theme.colors;
  const customs: CustomSection[] = (data.customSections || []) as CustomSection[];
  const layout: LayoutSectionConfig[] = useMemo(() => {
    if (data.layoutSections && data.layoutSections.length > 0) return data.layoutSections;
    return defaultLayoutSections(customs.map(s => s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.layoutSections, (data.customSections || []).length]);
  const filteredThemes = useMemo(() => searchThemes(themeSearch).slice(0, 24), [themeSearch]);

  const touch = () => { setDirty(true); setSaveState('idle'); };
  /** Typed accessor — TeacherData.customSections is any[] for chat flexibility. */
  const secs = (p: TeacherData): CustomSection[] => (p.customSections || []) as CustomSection[];

  // ── undo / redo (debounced snapshots so typing coalesces) ──
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      const snap = JSON.stringify(data);
      if (snap !== lastPushedRef.current) {
        lastPushedRef.current = snap;
        histRef.current = histPush(histRef.current, snap);
        setHistTick(x => x + 1);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [data, loaded]);
  const doUndo = () => {
    const snap = JSON.stringify(data);
    const { state, value } = histUndo(histRef.current, snap);
    if (value === null) return;
    histRef.current = state;
    lastPushedRef.current = value;
    setData(JSON.parse(value));
    touch();
    setHistTick(x => x + 1);
  };
  const doRedo = () => {
    const snap = JSON.stringify(data);
    const { state, value } = histRedo(histRef.current, snap);
    if (value === null) return;
    histRef.current = state;
    lastPushedRef.current = value;
    setData(JSON.parse(value));
    touch();
    setHistTick(x => x + 1);
  };
  const undoable = histCanUndo(histRef.current, JSON.stringify(data));
  const redoable = histCanRedo(histRef.current);
  void histTick;
  const setLayout = (next: LayoutSectionConfig[]) => { setData(p => ({ ...p, layoutSections: next })); touch(); };
  const cfgFor = (type: string, id?: string) => layout.find(l => (l.type === 'custom' ? l.id === id : l.type === type));

  const updateCustom = (id: string, patch: Partial<CustomSection>) => {
    setData(p => ({ ...p, customSections: secs(p).map(s => (s.id === id ? { ...s, ...patch } : s)) }));
    touch();
  };
  const updateBlock = (sectionId: string, blockId: string, patch: Partial<SectionBlock>) => {
    setData(p => ({
      ...p,
      customSections: secs(p).map(s =>
        s.id === sectionId ? { ...s, blocks: (s.blocks || []).map(b => (b.id === blockId ? { ...b, ...patch } : b)) } : s),
    }));
    touch();
  };
  const removeBlock = (sectionId: string, blockId: string) => {
    setData(p => ({
      ...p,
      customSections: secs(p).map(s =>
        s.id === sectionId ? { ...s, blocks: (s.blocks || []).filter(b => b.id !== blockId) } : s),
    }));
    setSel({ kind: 'section', id: sectionId });
    touch();
  };
  const duplicateBlock = (sectionId: string, blockId: string) => {
    setData(p => ({
      ...p,
      customSections: secs(p).map(s => {
        if (s.id !== sectionId) return s;
        const idx = (s.blocks || []).findIndex(b => b.id === blockId);
        if (idx < 0) return s;
        const copy = { ...s.blocks[idx], id: makeId('blk') };
        const blocks = [...s.blocks];
        blocks.splice(idx + 1, 0, copy);
        return { ...s, blocks };
      }),
    }));
    touch();
  };
  const moveBlock = (sectionId: string, blockId: string, dir: -1 | 1) => {
    setData(p => ({
      ...p,
      customSections: secs(p).map(s => {
        if (s.id !== sectionId) return s;
        const blocks = [...(s.blocks || [])];
        const i = blocks.findIndex(b => b.id === blockId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= blocks.length) return s;
        [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
        return { ...s, blocks };
      }),
    }));
    touch();
  };

  const addSectionFromTemplate = (templateId: string) => {
    const tpl = SECTION_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    const sec = tpl.make() as CustomSection;
    setData(p => ({
      ...p,
      customSections: [...secs(p), sec],
      layoutSections: [...(p.layoutSections && p.layoutSections.length ? p.layoutSections : defaultLayoutSections(secs(p).map((s: any) => s.id))), { type: 'custom', id: sec.id, variant: 'default' }],
    }));
    setSel({ kind: 'section', id: sec.id });
    touch();
  };
  const removeCustomSection = (id: string) => {
    setData(p => ({
      ...p,
      customSections: secs(p).filter(s => s.id !== id),
      layoutSections: (p.layoutSections || []).filter(l => !(l.type === 'custom' && l.id === id)),
    }));
    setSel(null);
    touch();
  };
  const duplicateCustomSection = (id: string) => {
    const src = customs.find(s => s.id === id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = makeId('sec');
    copy.title = (copy.title || 'Section') + ' (copy)';
    copy.blocks = (copy.blocks || []).map((b: any) => ({ ...b, id: makeId('blk') }));
    setData(p => {
      const base = p.layoutSections && p.layoutSections.length ? p.layoutSections : defaultLayoutSections(secs(p).map((s: any) => s.id));
      const idx = base.findIndex(l => l.type === 'custom' && l.id === id);
      const next = [...base];
      next.splice(idx + 1, 0, { type: 'custom', id: copy.id, variant: 'default' });
      return { ...p, customSections: [...secs(p), copy], layoutSections: next };
    });
    setSel({ kind: 'section', id: copy.id });
    touch();
  };

  // ── copy / paste section via clipboard ──
  const copySection = async (id: string) => {
    const src = customs.find(s => s.id === id);
    if (!src) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(src));
      setCopiedTick(x => x + 1);
      setTimeout(() => setCopiedTick(0), 1500);
    } catch {
      setPublishMsg('Copy failed — clipboard unavailable here.');
    }
  };
  const pasteSection = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw.blocks)) {
        setPublishMsg('Clipboard has no section to paste.');
        return;
      }
      const copy = JSON.parse(JSON.stringify(raw));
      copy.id = makeId('sec');
      copy.blocks = (copy.blocks || []).map((b: any) => ({ ...b, id: makeId('blk') }));
      setData(p => ({
        ...p,
        customSections: [...secs(p), copy],
        layoutSections: [...(p.layoutSections?.length ? p.layoutSections : defaultLayoutSections(secs(p).map(s => s.id))), { type: 'custom', id: copy.id, variant: 'default' }],
      }));
      setSel({ kind: 'section', id: copy.id });
      touch();
    } catch {
      setPublishMsg('Paste failed — copy a section first.');
    }
  };

  // ── selection actions (keyboard + buttons) ──
  const deleteSelected = () => {
    if (sel?.kind === 'block') removeBlock(sel.sectionId, sel.blockId);
    else if (sel?.kind === 'section') removeCustomSection(sel.id);
    else if (sel?.kind === 'core' && sel.ctype !== 'hero') {
      setData(p => ({ ...p, visibility: { ...(p.visibility || {}), [sel.ctype]: false } }));
      touch();
    }
  };
  const duplicateSelected = () => {
    if (sel?.kind === 'block') duplicateBlock(sel.sectionId, sel.blockId);
    else if (sel?.kind === 'section') duplicateCustomSection(sel.id);
  };

  // ── keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.tagName === 'SELECT');
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void save(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) { e.preventDefault(); deleteSelected(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, data]);

  // ── AI command bar (reuses the chat assistant engine) ──
  const runAiCommand = () => {
    const val = aiInput.trim();
    if (!val || aiBusy) return;
    setAiBusy(true);
    setAiResult('');
    setAiSuggestions([]);
    try {
      const res = runAssistant(val, {
        name: data.name,
        subject: data.subject,
        bio: data.bio,
        quote: data.quote,
        achievements: data.achievements,
        email: data.email,
        courses: data.courses,
        years: data.years,
        collected: true,
        currentThemeId: data.theme,
        currentThemeName: theme.name,
        customSections: secs(data) as any[],
        memory: aiMemory,
      });
      if (res.memory) setAiMemory(res.memory);
      setAiSuggestions(res.suggestions || []);
      for (const a of res.actions) {
        if (a.type === 'theme') {
          setData(p => ({ ...p, theme: a.themeId }));
        } else if (a.type === 'style') {
          setData(p => ({ ...p, style: { ...((p.style || {}) as object), ...a.patch } }));
        } else if (a.type === 'section' && a.op === 'add') {
          const sec = (a.section ?? (() => {
            const tpl = SECTION_TEMPLATES.find(t => t.id === a.templateId);
            return (tpl ? tpl.make() : { id: makeId('sec'), title: 'New Section', badge: '', subtitle: '', showHeader: true, layout: 'stack' as const, bg: '#111827', bgStyle: 'alt' as const, pattern: 'dots', padding: 'normal' as const, radius: 'rounded' as const, align: 'left' as const, maxWidth: 'normal' as const, blocks: [] });
          })()) as CustomSection;
          if (a.templateId === 'gallery' && (data.gallery || []).length > 0) {
            const photos = (data.gallery || []).slice(0, 8);
            sec.blocks = photos.map((src: string, i: number) => ({
              ...sec.blocks[i % Math.max(1, sec.blocks.length)],
              id: makeId('blk'),
              type: 'image' as const,
              src,
              alt: `Gallery photo ${i + 1}`,
            }));
          }
          setData(p => ({
            ...p,
            customSections: [...secs(p), sec],
            layoutSections: [...(p.layoutSections?.length ? p.layoutSections : defaultLayoutSections(secs(p).map(s => s.id))), { type: 'custom', id: sec.id, variant: 'default' }],
          }));
          setSel({ kind: 'section', id: sec.id });
        } else if (a.type === 'section' && a.op === 'remove') {
          removeCustomSection(a.sectionId);
        }
      }
      // Plain-text reply (strip markdown) for the compact result bubble.
      setAiResult(res.text.replace(/\*\*(.*?)\*\*/g, '$1'));
      touch();
      if (res.build) void publish();
    } catch {
      setAiResult('The AI hit a snag — try rephrasing.');
    }
    setAiBusy(false);
  };

  // ── revisions (server history snapshots of TeacherData) ──
  const refreshRevisions = async () => {
    setRevisionsLoading(true);
    try {
      const r = await fetch('/api/history?limit=30');
      const list = await r.json();
      setRevisions(Array.isArray(list) ? list : []);
    } catch {}
    setRevisionsLoading(false);
  };
  const snapshotRevision = async () => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _studioRev: true, savedAt: new Date().toISOString(), data }),
      });
      await refreshRevisions();
    } catch {}
  };
  const restoreRevision = async (id: number) => {
    try {
      const r = await fetch(`/api/history?id=${id}`);
      const entry = await r.json();
      const doc = entry?.data?.data ?? entry?.data;
      const parsed = sanitizeImportedPage(doc);
      if (!parsed.ok) {
        setPublishMsg('That snapshot is a site-content backup, not a Studio design — cannot restore here.');
        return;
      }
      setData(parsed.data);
      setSel(null);
      touch();
      setHistoryOpen(false);
      setPublishMsg('Revision restored. Review, then Publish to go live.');
    } catch {
      setPublishMsg('Restore failed — try again.');
    }
  };

  // ── export / import ──
  const exportPage = () => {
    const blob = new Blob([JSON.stringify(buildExportDoc(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacherfolio-${(data.name || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importPage = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      const parsed = sanitizeImportedPage(raw);
      if (!parsed.ok) {
        setPublishMsg(`Import failed: ${parsed.error}`);
        return;
      }
      const incoming = parsed.data;
      if (!incoming.layoutSections?.length) {
        incoming.layoutSections = defaultLayoutSections((incoming.customSections || []).map((s: any) => s.id));
      }
      setData(incoming);
      setSel(null);
      touch();
      setPublishMsg('Design imported. Review, Save, then Publish.');
    } catch {
      setPublishMsg('Import failed: not valid JSON.');
    }
  };

  // ── drag & drop ──
  const onDropSection = (e: DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/x-studio'));
      if (payload.kind === 'section') {
        const from = layout.findIndex(l => (l.type === 'custom' ? `custom:${l.id}` : l.type) === payload.key);
        if (from < 0) return;
        const next = [...layout];
        const [moved] = next.splice(from, 1);
        next.splice(targetIdx > from ? targetIdx - 1 : targetIdx, 0, moved);
        setLayout(next);
      } else if (payload.kind === 'block-new' && payload.sectionId) {
        // new widget dropped onto a custom section's drop zone
        const blk = newBlock(payload.blockType as BlockType);
        updateCustom(payload.sectionId, { blocks: [...(customs.find(s => s.id === payload.sectionId)?.blocks || []), blk] });
        setSel({ kind: 'block', sectionId: payload.sectionId, blockId: blk.id });
      } else if (payload.kind === 'block-move' && payload.sectionId) {
        // move existing block to end of another section
        const src = customs.find(s => s.id === payload.fromSection);
        const blk = src?.blocks?.find(b => b.id === payload.blockId);
        if (!blk || payload.fromSection === payload.sectionId) return;
        setData(p => ({
          ...p,
          customSections: secs(p).map(s => {
            if (s.id === payload.fromSection) return { ...s, blocks: (s.blocks || []).filter(b => b.id !== payload.blockId) };
            if (s.id === payload.sectionId) return { ...s, blocks: [...(s.blocks || []), blk] };
            return s;
          }),
        }));
        setSel({ kind: 'block', sectionId: payload.sectionId, blockId: blk.id });
        touch();
      }
    } catch {}
  };
  const onDropAppendBlock = (e: DragEvent, sectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/x-studio'));
      if (payload.kind === 'block-new') {
        const blk = newBlock(payload.blockType as BlockType);
        updateCustom(sectionId, { blocks: [...(customs.find(s => s.id === sectionId)?.blocks || []), blk] });
        setSel({ kind: 'block', sectionId, blockId: blk.id });
      } else if (payload.kind === 'block-move') {
        const src = customs.find(s => s.id === payload.fromSection);
        const blk = src?.blocks?.find(b => b.id === payload.blockId);
        if (!blk || payload.fromSection === sectionId) return;
        setData(p => ({
          ...p,
          customSections: secs(p).map(s => {
            if (s.id === payload.fromSection) return { ...s, blocks: (s.blocks || []).filter(b => b.id !== payload.blockId) };
            if (s.id === sectionId) return { ...s, blocks: [...(s.blocks || []), blk] };
            return s;
          }),
        }));
        setSel({ kind: 'block', sectionId, blockId: blk.id });
        touch();
      }
    } catch {}
  };
  const onDropBlock = (e: DragEvent, sectionId: string, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/x-studio'));
      if (payload.kind === 'block-new') {
        const blk = newBlock(payload.blockType as BlockType);
        setData(p => ({
          ...p,
          customSections: secs(p).map(s => {
            if (s.id !== sectionId) return s;
            const blocks = [...(s.blocks || [])];
            const i = blocks.findIndex(b => b.id === blockId);
            blocks.splice(i < 0 ? blocks.length : i, 0, blk);
            return { ...s, blocks };
          }),
        }));
        setSel({ kind: 'block', sectionId, blockId: blk.id });
        touch();
      } else if (payload.kind === 'block-move') {
        const blkId = payload.blockId as string;
        const fromSec = payload.fromSection as string;
        if (fromSec === sectionId && blkId === blockId) return;
        setData(p => {
          const all = secs(p).map(s => ({ ...s, blocks: [...(s.blocks || [])] }));
          const src = all.find(s => s.id === fromSec);
          const bi = src?.blocks.findIndex(b => b.id === blkId) ?? -1;
          if (!src || bi < 0) return p;
          const [blk] = src.blocks.splice(bi, 1);
          const dst = all.find(s => s.id === sectionId);
          if (!dst) return p;
          const di = dst.blocks.findIndex(b => b.id === blockId);
          dst.blocks.splice(di < 0 ? dst.blocks.length : di, 0, blk);
          return { ...p, customSections: all };
        });
        setSel({ kind: 'block', sectionId, blockId: blkId });
        touch();
      }
    } catch {}
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (file.size > 10 * 1024 * 1024) return null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/media', { method: 'POST', body: fd });
      const out = await res.json().catch(() => null);
      if (!res.ok) throw new Error();
      await refreshMedia();
      return out.url as string;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  };
  const applyUploadedUrl = (url: string) => {
    const t = pendingImgTarget.current;
    if (t === 'photo') setData(p => ({ ...p, photo: url }));
    else if (t) updateBlock(t.sectionId, t.blockId, { src: url });
    touch();
  };

  const pickMedia = (url: string) => {
    if (sel?.kind === 'block') {
      const sec = customs.find(s => s.id === sel.sectionId);
      if (sec?.blocks?.find(b => b.id === sel.blockId)?.type === 'image') {
        updateBlock(sel.sectionId, sel.blockId, { src: url });
        return;
      }
    }
    if (sel?.kind === 'core' && sel.ctype === 'hero') {
      setData(p => ({ ...p, photo: url }));
      touch();
      return;
    }
  };

  const pickFile = (url: string) => {
    if (sel?.kind === 'block') {
      const sec = customs.find(s => s.id === sel.sectionId);
      if (sec?.blocks?.find(b => b.id === sel.blockId)?.type === 'file') {
        updateBlock(sel.sectionId, sel.blockId, { src: url });
        return;
      }
    }
    try {
      void navigator.clipboard.writeText(window.location.origin + url);
      setPublishMsg('File link copied — paste it into any file block URL field.');
    } catch {
      setPublishMsg(`File URL: ${url}`);
    }
  };

  const save = async () => {
    setSaveState('saving');
    try {
      // Also push a studio log into chat so Build page's history shows the Studio edit
      const summary = `Studio saved — ${theme.name} • ${customs.length} sections • ${new Date().toLocaleTimeString()}`;
      const nextMsgs = [...chatMessages, { role: 'bot', text: summary, _studioSync: true, ts: Date.now() }];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMsgs, step: 'done', data, memory: chatMemory }),
      });
      if (!res.ok) throw new Error();
      setChatMessages(nextMsgs);
      setSaveState('saved');
      setDirty(false);
      notifyStudioUpdate(data);
    } catch {
      setSaveState('error');
    }
  };

  const publish = async () => {
    setPublishState('publishing');
    setPublishMsg('');
    try {
      const payload = teacherDataToContent(data);
      const put = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!put.ok) throw new Error('save failed');
      const build = await fetch('/api/build', { method: 'POST' });
      if (!build.ok) throw new Error('build failed');
      // Also sync chat so Build's chat sees the publish
      const pubMsg = { role: 'bot', text: ` Studio published — live at /s/${user?.id || ''} ✨`, _studioSync: true, ts: Date.now() };
      const nextMsgs = [...chatMessages, pubMsg];
      await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: nextMsgs, step: 'done', data, memory: chatMemory }) }).catch(() => {});
      setChatMessages(nextMsgs);
      setPublishState('done');
      setPublishMsg('Published! Your live site + preview are updated.');
      setDirty(false);
      notifyStudioUpdate(data);
    } catch {
      setPublishState('error');
      setPublishMsg('Publish failed — try again.');
    }
  };

  if (!authChecked || (user && !loaded)) return <SkeletonPage />;
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-950 text-slate-200 font-sans items-center justify-center p-6">
        <div className="bg-surface-700 border border-white/[0.08] rounded-3xl p-12 max-w-[440px] w-full text-center shadow-2xl">
          <div className="text-[3rem] mb-4">🎨</div>
          <h1 className="text-2xl font-black text-white mb-3">Visual Studio</h1>
          <p className="text-sm text-slate-400 mb-8">Sign in to drag, drop and design your site like Elementor.</p>
          <button onClick={() => setIsAuthOpen(true)} className="px-6 py-3.5 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-brand-500/40">Sign In</button>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={u => setUser(u)} />
      </div>
    );
  }

  const selSection = sel?.kind === 'section' ? customs.find(s => s.id === sel.id) : null;
  const selBlock = sel?.kind === 'block'
    ? customs.find(s => s.id === sel.sectionId)?.blocks?.find(b => b.id === sel.blockId) ?? null
    : null;
  const selBlockSection = sel?.kind === 'block' ? customs.find(s => s.id === sel.sectionId) ?? null : null;

  return (
    <div className="h-screen flex flex-col bg-surface-950 text-slate-200 font-sans">
      {/* top bar */}
      <header className="glass-strong border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center no-underline text-white"><Logo size={28} wordmark /></Link>
        <span className="text-[0.65rem] font-bold uppercase tracking-widest text-brand-300 bg-brand-500/10 border border-brand-500/25 rounded-full px-2.5 py-1">Studio</span>
        <Link href="/build" className="text-xs text-slate-400 no-underline hover:text-white transition-colors hidden md:inline">← Chat</Link>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
          <button onClick={doUndo} disabled={!undoable} title="Undo (Ctrl+Z)" className="px-2 py-1 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30">↩</button>
          <button onClick={doRedo} disabled={!redoable} title="Redo (Ctrl+Shift+Z)" className="px-2 py-1 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30">↪</button>
        </div>
        <div className="hidden lg:flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
          {(['desktop', 'tablet', 'mobile'] as const).map(d => (
            <button key={d} onClick={() => setDevice(d)} title={`${d} preview`}
              className={`px-2 py-1 rounded-lg text-xs transition-colors ${device === d ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-200'}`}>
              {d === 'desktop' ? '🖥' : d === 'tablet' ? '📱' : '📲'}
            </button>
          ))}
        </div>
        <button onClick={() => setLayersOpen(v => !v)} title="Navigator (layers)"
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${layersOpen ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'}`}>🗂</button>
        <button onClick={() => { setHistoryOpen(true); void refreshRevisions(); }} title="Revisions"
          className="px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white transition-all">🕘</button>
        <button onClick={() => setAuditOpen(true)} title="Site audit (SEO, accessibility, content)"
          className="px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white transition-all">✓</button>
        <div className="hidden sm:flex items-center gap-1">
          <button onClick={exportPage} title="Export design JSON" className="px-2.5 py-2 rounded-xl text-xs bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white transition-all">⤓</button>
          <button onClick={() => importRef.current?.click()} title="Import design JSON" className="px-2.5 py-2 rounded-xl text-xs bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white transition-all">⤒</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[0.65rem] font-semibold hidden sm:inline ${dirty ? 'text-amber-300' : saveState === 'saved' ? 'text-emerald-400' : 'text-slate-600'}`}>
            {dirty ? '● Unsaved' : saveState === 'saved' ? '✓ Saved' : saveState === 'error' ? 'Save failed' : 'Synced'}
          </span>
          <button onClick={save} disabled={!dirty} className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.05] border border-white/10 text-slate-200 hover:bg-white/[0.09] disabled:opacity-40 transition-all">💾 Save</button>
          <button onClick={publish} disabled={publishState === 'publishing'} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {publishState === 'publishing' ? 'Publishing…' : '🚀 Publish'}
          </button>
        </div>
      </header>
      {publishMsg && (
        <div className={`px-4 py-2 text-xs font-semibold text-center flex-shrink-0 ${publishState === 'done' ? 'bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-b border-red-500/20'}`}>{publishMsg}</div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Navigator (layers) overlay */}
        {layersOpen && (
          <div className="absolute left-[248px] top-0 bottom-0 w-[260px] z-30 bg-[#0a0d14]/95 backdrop-blur border-r border-white/10 flex flex-col min-h-0 shadow-2xl">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.07]">
              <span className="text-xs font-extrabold text-white">🗂 Navigator</span>
              <button onClick={() => setLayersOpen(false)} className="ml-auto text-slate-500 hover:text-white text-sm px-1">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {layout.map((l, idx) => {
                const isCustom = l.type === 'custom';
                const sec = isCustom ? customs.find(s => s.id === l.id) : null;
                const label = isCustom ? (sec?.title || 'Custom section') : (CORE_META.find(m => m.type === l.type)?.label || l.type);
                const icon = isCustom ? '📄' : (CORE_META.find(m => m.type === l.type)?.icon || '•');
                const hiddenRow = !isCustom && l.type !== 'hero' && data.visibility?.[l.type] === false;
                const active = isCustom ? sel?.kind === 'section' && sel.id === l.id : sel?.kind === 'core' && sel.ctype === l.type;
                return (
                  <div key={isCustom ? `custom:${l.id}` : l.type}>
                    <div draggable
                      onDragStart={e => e.dataTransfer.setData('application/x-studio', JSON.stringify({ kind: 'section', key: isCustom ? `custom:${l.id}` : l.type }))}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => onDropSection(e, idx)}
                      onClick={() => setSel(isCustom ? { kind: 'section', id: l.id! } : { kind: 'core', ctype: l.type })}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer border ${active ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'border-transparent hover:bg-white/[0.04] text-slate-300'}`}>
                      <span className="text-slate-600 cursor-grab text-[0.6rem]">⋮⋮</span>
                      <span>{icon}</span>
                      <span className="flex-1 truncate font-semibold">{label}</span>
                      {!isCustom && l.type !== 'hero' && (
                        <button title="Toggle visibility" onClick={e => {
                          e.stopPropagation();
                          setData(p => ({ ...p, visibility: { ...(p.visibility || {}), [l.type]: !(p.visibility?.[l.type] !== false) } }));
                          touch();
                        }} className="text-[0.7rem] opacity-70 hover:opacity-100">{hiddenRow ? '👁‍🗨' : '👁'}</button>
                      )}
                      {isCustom && (
                        <button title="Delete section" onClick={e => { e.stopPropagation(); removeCustomSection(l.id!); }} className="text-[0.7rem] opacity-60 hover:opacity-100 hover:text-red-300">🗑</button>
                      )}
                    </div>
                    {isCustom && (sec?.blocks || []).length > 0 && (
                      <div className="ml-6 border-l border-white/10 pl-1 mt-0.5 mb-1">
                        {(sec!.blocks || []).map(b => {
                          const meta = BLOCK_META.find(m => m.type === b.type);
                          const bActive = sel?.kind === 'block' && sel.sectionId === l.id && sel.blockId === b.id;
                          const bLabel = b.type === 'heading' ? (b.text || 'Heading').slice(0, 24)
                            : b.type === 'text' ? (b.text || 'Text').slice(0, 24)
                            : b.type === 'image' ? 'Image' : b.type === 'button' ? (b.label || 'Button')
                            : b.type === 'card' ? (b.title || 'Card') : b.type === 'quote' ? 'Quote'
                            : b.type === 'stat' ? (b.label || 'Stat') : b.type === 'list' ? 'List'
                            : b.type === 'html' ? 'HTML' : b.type;
                          return (
                            <div key={b.id} draggable
                              onDragStart={e => { e.dataTransfer.setData('application/x-studio', JSON.stringify({ kind: 'block-move', blockId: b.id, fromSection: l.id })); e.stopPropagation(); }}
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => onDropBlock(e, l.id!, b.id)}
                              onClick={() => setSel({ kind: 'block', sectionId: l.id!, blockId: b.id })}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[0.68rem] cursor-pointer ${bActive ? 'bg-brand-500/15 text-brand-200' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}>
                              <span>{meta?.icon}</span>
                              <span className="truncate">{bLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t border-white/[0.07] text-[0.62rem] text-slate-600">Drag rows to reorder · Del removes selection</div>
          </div>
        )}
        <aside className="w-[248px] flex-shrink-0 border-r border-white/[0.06] bg-[#0a0d14] flex flex-col min-h-0">
          <div className="flex gap-1 p-2 border-b border-white/[0.06]">
            {([['blocks', '🧩'], ['sections', '📄'], ['media', '🖼'], ['theme', '🎨'], ['design', '🖌']] as const).map(([id, icon]) => (
              <button key={id} onClick={() => setLeftTab(id)} title={id}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${leftTab === id ? 'bg-brand-500/15 text-brand-200 border border-brand-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>{icon}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {leftTab === 'blocks' && (
              <>
                <p className="text-[0.65rem] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Drag a widget onto the canvas</p>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_META.map(b => (
                    <div key={b.type} draggable
                      onDragStart={e => e.dataTransfer.setData('application/x-studio', JSON.stringify({ kind: 'block-new', blockType: b.type }))}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center cursor-grab active:cursor-grabbing hover:border-brand-500/50 hover:bg-brand-500/[0.07] transition-all">
                      <div className="text-xl mb-1">{b.icon}</div>
                      <div className="text-[0.65rem] font-bold text-slate-300">{b.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[0.62rem] text-slate-600 mt-3 leading-relaxed">Tip: drop widgets onto a custom section, or between its blocks. New widgets land in the selected section.</p>
                <button onClick={() => {
                  const target = sel?.kind === 'section' ? sel.id : sel?.kind === 'block' ? sel.sectionId : customs[customs.length - 1]?.id;
                  if (!target) return;
                  const blk = newBlock('text');
                  updateCustom(target, { blocks: [...(customs.find(s => s.id === target)?.blocks || []), blk] });
                  setSel({ kind: 'block', sectionId: target, blockId: blk.id });
                }} className="mt-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-dashed border-white/15 hover:text-white hover:border-white/30 transition-colors">+ Add text to selected section</button>
              </>
            )}
            {leftTab === 'sections' && (
              <>
                <p className="text-[0.65rem] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Core sections</p>
                <div className="flex flex-col gap-1.5 mb-4">
                  {CORE_META.map(m => (
                    <button key={m.type} onClick={() => setSel({ kind: 'core', ctype: m.type })}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-colors ${sel?.kind === 'core' && sel.ctype === m.type ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-white/[0.02] border-white/[0.07] text-slate-300 hover:border-white/20'}`}>
                      <span>{m.icon}</span>{m.label}
                      {data.visibility?.[m.type] === false && <span className="ml-auto text-slate-600">👁‍🗨</span>}
                    </button>
                  ))}
                </div>
                <p className="text-[0.65rem] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Add pre-made section</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {SECTION_TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => addSectionFromTemplate(t.id)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs border bg-white/[0.02] border-white/[0.07] hover:border-brand-500/50 hover:bg-brand-500/[0.06] transition-all text-left">
                      <span className="text-base">{t.icon}</span>
                      <span><span className="block font-bold text-slate-200">{t.name}</span><span className="block text-[0.62rem] text-slate-500">{t.desc}</span></span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {leftTab === 'media' && (
              <>
                <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={async e => {
                  const f = e.target.files?.[0]; e.target.value = '';
                  if (!f) return;
                  const url = await uploadImage(f);
                  if (url) { pendingImgTarget.current = 'photo'; applyUploadedUrl(url); }
                }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg shadow-brand-500/25 disabled:opacity-50 mb-2">
                  {uploading ? 'Uploading…' : '📤 Upload image'}
                </button>
                <button onClick={refreshMedia} className="w-full px-3 py-1.5 rounded-xl text-[0.65rem] font-semibold text-slate-500 hover:text-slate-300 transition-colors mb-2">↻ Refresh library</button>
                {mediaLoading ? <p className="text-xs text-slate-500 text-center py-6">Loading…</p> : media.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-6">No uploads yet.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-1.5">
                      {media.filter((m: any) => /\.(png|jpe?g|gif|webp|ico)$/i.test(m.url || m.filename || '')).map((m: any) => (
                        <button key={m.id} onClick={() => pickMedia(m.url)} title="Click to apply to selected image / hero"
                          className="rounded-lg overflow-hidden border border-white/10 hover:border-brand-500/60 transition-all aspect-square bg-white/[0.03]">
                          <img src={m.url} alt={m.original_name || ''} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                    {media.some((m: any) => !/\.(png|jpe?g|gif|webp|ico)$/i.test(m.url || m.filename || '')) && (
                      <div className="mt-2">
                        <p className="text-[0.65rem] text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">📎 Documents</p>
                        <div className="flex flex-col gap-1.5">
                          {media.filter((m: any) => !/\.(png|jpe?g|gif|webp|ico)$/i.test(m.url || m.filename || '')).map((m: any) => (
                            <button key={m.id} onClick={() => pickFile(m.url)} title="Apply to selected file block, or copy link"
                              className="flex items-center gap-2 rounded-lg border border-white/10 hover:border-brand-500/60 transition-all bg-white/[0.03] px-2.5 py-2 text-left">
                              <span>📄</span>
                              <span className="flex-1 min-w-0"><span className="block text-[0.65rem] font-bold text-slate-300 truncate">{m.original_name || m.filename}</span></span>
                              <span className="text-[0.6rem] text-slate-600">use →</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <p className="text-[0.62rem] text-slate-600 mt-2 leading-relaxed">Click a photo to apply it to the selected image block — or select the Hero section to set your profile photo.</p>
              </>
            )}
            {leftTab === 'design' && (
              <DesignTab />
            )}
            {leftTab === 'theme' && (
              <>
                <input value={themeSearch} onChange={e => setThemeSearch(e.target.value)} placeholder="Search 1,000+ themes…"
                  className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-brand-500 placeholder:text-slate-600 mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  {filteredThemes.map(t => (
                    <button key={t.id} onClick={() => { setData(p => ({ ...p, theme: t.id })); touch(); }}
                      className={`p-1.5 rounded-xl text-left border transition-all ${data.theme === t.id ? 'ring-2 ring-brand-400 border-transparent' : 'border-white/[0.07] hover:border-white/25'}`}>
                      <div className="rounded-lg overflow-hidden border border-white/10 mb-1" style={{ background: t.colors.background }}>
                        <div className="px-1.5 py-1 flex items-center justify-between" style={{ background: t.colors.surface }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.colors.primary }} />
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.colors.accent }} />
                        </div>
                        <div className="px-1.5 py-1.5">
                          <span className="block h-1 w-10 rounded-full mb-1" style={{ background: t.colors.primary }} />
                          <span className="block h-1 w-8 rounded-full" style={{ background: t.colors.muted }} />
                        </div>
                      </div>
                      <div className="text-[0.6rem] font-bold text-slate-300 truncate px-0.5">{t.name}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* canvas */}
        <main className="flex-1 overflow-y-auto bg-[#060810] min-w-0 p-4">
          {/* AI command bar */}
          <div className="mx-auto mb-3 rounded-2xl border border-brand-500/25 bg-brand-500/[0.05] p-2.5 transition-all"
            style={{ maxWidth: device === 'mobile' ? 375 : device === 'tablet' ? 500 : 760 }}>
            <div className="flex gap-2 items-center">
              <span className="text-sm pl-1">✨</span>
              <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') runAiCommand(); }}
                placeholder='Ask Studio AI — "calm blue theme", "add testimonials", "split hero"…'
                className="flex-1 min-w-0 px-3 py-2 bg-surface-800 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-brand-500 placeholder:text-slate-600" />
              <button onClick={runAiCommand} disabled={aiBusy || !aiInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-purple-600 disabled:opacity-40 flex-shrink-0">
                {aiBusy ? '…' : 'Apply'}
              </button>
            </div>
            {aiResult && <p className="text-[0.68rem] text-slate-400 leading-relaxed mt-2 px-1">{aiResult}</p>}
            {aiSuggestions.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2 px-1">
                {aiSuggestions.map((s, i) => (
                  <button key={i} onClick={() => { setAiInput(s); setTimeout(runAiCommand, 50); }}
                    className="px-2.5 py-1 rounded-full text-[0.62rem] font-semibold text-brand-200 bg-brand-500/10 border border-brand-500/25 hover:bg-brand-500/20 transition-all">{s} →</button>
                ))}
              </div>
            )}
          </div>
          <div className="mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all"
            style={{ background: c.background, maxWidth: device === 'mobile' ? 375 : device === 'tablet' ? 500 : 760 }}>
            <div className="px-4 py-2 text-center text-[0.6rem] font-bold uppercase tracking-widest text-slate-600 border-b border-white/[0.06]">
              {device === 'mobile' ? '📲 Mobile · 375px' : device === 'tablet' ? '📱 Tablet · 500px' : '🖥 Desktop'}
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor: c.border, background: c.surface }}>
              <span className="text-xs font-extrabold" style={{ color: c.primary }}>{data.name || 'Your site'} · Preview</span>
              <span className="text-[0.6rem] text-slate-500">click to edit · drag ⋮⋮ to move</span>
            </div>
            {layout.map((l, idx) => {
              const key = l.type === 'custom' ? `custom:${l.id}` : l.type;
              const hidden = l.type !== 'custom' && l.type !== 'hero' && data.visibility?.[l.type] === false;
              return (
                <div key={key}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('application/x-studio', JSON.stringify({ kind: 'section', key })); e.stopPropagation(); }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => onDropSection(e, idx)}
                  onClick={() => setSel(l.type === 'custom' ? { kind: 'section', id: l.id! } : { kind: 'core', ctype: l.type })}
                  className={`relative group cursor-pointer transition-all ${isSelSection(l) ? 'ring-2 ring-inset ring-brand-400' : 'hover:ring-1 hover:ring-inset hover:ring-white/25'} ${hidden ? 'opacity-40' : ''}`}>
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 z-10 text-slate-500 opacity-0 group-hover:opacity-100 cursor-grab text-xs px-1" title="Drag to reorder">⋮⋮</span>
                  {l.type === 'custom' ? renderCustomCanvas(l.id!) : renderCoreCanvas(l.type, cfgFor(l.type))}
                  {hidden && <span className="absolute right-2 top-2 text-[0.6rem] font-bold text-slate-500 bg-black/40 rounded-full px-2 py-0.5">hidden</span>}
                </div>
              );
            })}
            {/* drop zone for new custom section via template */}
            <div onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                try {
                  const p = JSON.parse(e.dataTransfer.getData('application/x-studio'));
                  if (p.kind === 'block-new') {
                    const sec: CustomSection = {
                      id: makeId('sec'), title: 'New Section', badge: '', subtitle: '', showHeader: true,
                      layout: 'stack', bg: '#111827', bgStyle: 'alt', pattern: 'dots', padding: 'normal',
                      radius: 'rounded', align: 'left', maxWidth: 'normal', blocks: [newBlock(p.blockType as BlockType)],
                    };
                    setData(d => ({
                      ...d,
                      customSections: [...(d.customSections || []), sec],
                      layoutSections: [...(d.layoutSections?.length ? d.layoutSections : defaultLayoutSections((d.customSections || []).map((s: any) => s.id))), { type: 'custom', id: sec.id, variant: 'default' }],
                    }));
                    setSel({ kind: 'section', id: sec.id });
                    touch();
                  }
                } catch {}
              }}
              className="m-3 rounded-xl border border-dashed border-white/15 text-center py-5 text-[0.68rem] text-slate-500">
              Drop a widget here to start a new section
            </div>
          </div>
        </main>

        {/* inspector */}
        <aside className="w-[264px] flex-shrink-0 border-l border-white/[0.06] bg-[#0a0d14] overflow-y-auto p-4 min-h-0">
          <Inspector />
        </aside>
      </div>

      <input ref={inspectorUploadRef} type="file" accept={ACCEPT} hidden onChange={async e => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        const url = await uploadImage(f);
        if (url) applyUploadedUrl(url);
      }} />
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (f) void importPage(f);
      }} />

      {/* Audit modal */}
      {auditOpen && <AuditModal data={data} onClose={() => setAuditOpen(false)} />}

      {/* Revisions modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setHistoryOpen(false)}>
          <div className="bg-[#0d1119] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.07]">
              <span className="text-sm font-extrabold text-white">🕘 Revisions</span>
              <button onClick={snapshotRevision} className="ml-auto px-3 py-1.5 rounded-lg text-[0.65rem] font-bold bg-white/[0.05] border border-white/10 hover:border-white/30">📸 Snapshot now</button>
              <button onClick={() => setHistoryOpen(false)} className="text-slate-500 hover:text-white px-1">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {revisionsLoading ? (
                <p className="text-xs text-slate-500 text-center py-8">Loading revisions…</p>
              ) : revisions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-xs text-slate-500">No snapshots yet.<br />Take one before big changes — restores are one click.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {revisions.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-200">
                          {v.summary?.siteTitle || v.summary?.heroTitle || `Snapshot #${v.id}`}
                        </div>
                        <div className="text-[0.62rem] text-slate-500">
                          {v.created_at ? new Date(v.created_at).toLocaleString() : ''} · {(v.summary?.sizeBytes / 1024).toFixed(1) || '?'} KB
                        </div>
                      </div>
                      <button onClick={() => restoreRevision(v.id)}
                        className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold bg-brand-500/15 border border-brand-500/40 text-brand-200 hover:bg-brand-500/25 flex-shrink-0">Restore</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="px-5 py-3 text-[0.62rem] text-slate-600 border-t border-white/[0.07]">Restoring swaps your current design into view — Publish to make it live.</p>
          </div>
        </div>
      )}
    </div>
  );

  /** Global Styles tab — site-wide design tokens stored in data.style. */
  function DesignTab() {
    const st = (data.style || {}) as Record<string, any>;
    const setStyle = (patch: Record<string, any>) => {
      setData(p => ({ ...p, style: { ...((p.style || {}) as object), ...patch } }));
      touch();
    };
    const optBtn = (active: boolean) =>
      `px-2 py-1.5 rounded-lg text-[0.65rem] font-bold border capitalize ${active ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400 hover:border-white/25'}`;
    return (
      <div>
        <p className="text-[0.65rem] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Site-wide design</p>
        <Field label="Font pairing">
          <select className={inpCls} value={st.fontPair || 'modern-sans'} onChange={e => setStyle({ fontPair: e.target.value })}>
            {FONT_PAIRS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="Corner roundness">
          <div className="flex gap-1.5">{(['sharp', 'rounded', 'pill'] as const).map(v => (
            <button key={v} onClick={() => setStyle({ roundness: v })} className={`${optBtn((st.roundness || 'rounded') === v)} flex-1`}>{v}</button>))}</div>
        </Field>
        <Field label="Shadow depth">
          <div className="grid grid-cols-2 gap-1.5">{(['flat', 'soft', 'elevated', 'deep'] as const).map(v => (
            <button key={v} onClick={() => setStyle({ shadowDepth: v === 'flat' ? 'none' : v })} className={optBtn((st.shadowDepth || 'soft') === (v === 'flat' ? 'none' : v))}>{v}</button>))}</div>
        </Field>
        <Field label="Section spacing">
          <div className="flex gap-1.5">{(['compact', 'normal', 'spacious'] as const).map(v => (
            <button key={v} onClick={() => setStyle({ spacing: v })} className={`${optBtn((st.spacing || 'normal') === v)} flex-1`}>{v}</button>))}</div>
        </Field>
        <Field label="Button shape">
          <div className="flex gap-1.5">{(['square', 'rounded', 'pill'] as const).map(v => (
            <button key={v} onClick={() => setStyle({ buttonStyle: v })} className={`${optBtn((st.buttonStyle || 'rounded') === v)} flex-1`}>{v}</button>))}</div>
        </Field>
        <Field label="Card style">
          <div className="flex gap-1.5">{(['bordered', 'elevated', 'minimal'] as const).map(v => (
            <button key={v} onClick={() => setStyle({ sectionStyle: v })} className={`${optBtn((st.sectionStyle || 'bordered') === v)} flex-1`}>{v}</button>))}</div>
        </Field>
        <Field label="Header behavior">
          <button onClick={() => setStyle({ headerFixed: st.headerFixed === false })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${st.headerFixed !== false ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-500'}`}>
            {st.headerFixed !== false ? '📌 Fixed header' : '○ Scrolls away'}
          </button>
        </Field>
        <p className="text-[0.62rem] text-slate-600 leading-relaxed">Applies to the whole site on Publish. The canvas preview reflects roundness + spacing live.</p>
      </div>
    );
  }

  function isSelSection(l: LayoutSectionConfig) {
    if (!sel) return false;
    if (l.type === 'custom') return sel.kind === 'section' && sel.id === l.id;
    return sel.kind === 'core' && sel.ctype === l.type;
  }

  function renderCoreCanvas(type: string, cfg?: LayoutSectionConfig) {
    const st = (data.style || {}) as Record<string, any>;
    const srad = ({ sharp: '4px', rounded: '12px', pill: '28px' } as Record<string, string>)[st.roundness || 'rounded'] || '12px';
    const padFor = (cfgPad?: string) => {
      const v = cfgPad || st.spacing || 'normal';
      return v === 'compact' ? '28px 0' : v === 'spacious' ? '64px 0' : '44px 0';
    };
    const pad = padFor(cfg?.padding);
    const wrap = (inner: string, bg?: string) =>
      `<section style="padding:${pad};${bg ? `background:${bg};` : ''}"><div style="max-width:640px;margin:0 auto;padding:0 18px">${inner}</div></section>`;
    const title = (t: string) => `<h2 style="font-size:1.15rem;font-weight:800;text-align:center;margin:0 0 8px;color:${c.text}">${t}</h2>`;
    const sub = (t: string) => `<p style="font-size:.82rem;color:${c.muted};text-align:center;margin:0 0 14px">${t}</p>`;
    let html = '';
    if (type === 'hero') {
      const photo = /^(https?:\/\/|\/\/|\/|data:image\/)/i.test(data.photo || '') ? data.photo : '';
      html = `<section style="padding:34px 0;text-align:center"><div style="max-width:640px;margin:0 auto;padding:0 18px">
        <div style="font-size:.62rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${c.primary}">${data.subject || 'Educator Portfolio'}</div>
        <h1 style="font-size:1.7rem;font-weight:800;margin:8px 0;color:${c.text}">Hello, I'm <span style="color:${c.primary}">${data.name || '…'}</span></h1>
        <p style="font-size:.84rem;color:${c.muted};max-width:520px;margin:0 auto">${(data.bio || 'Your story builds here as you chat.').slice(0, 160)}</p>
        ${photo ? `<img src="${photo}" style="width:84px;height:84px;object-fit:cover;border-radius:50%;display:block;margin:12px auto 0;border:3px solid ${c.primary}" />`
          : `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${c.primary},${c.accent});display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;margin-top:12px">${(data.name || 'T').slice(0, 1)}</div>`}
      </div></section>`;
    } else if (type === 'about') {
      html = wrap(`${title('About Me')}${sub((data.bio || 'Tell your story in chat.').slice(0, 160))}
        <div style="display:flex;gap:10px;justify-content:space-around;background:${c.surface};border:1px solid ${c.border};border-radius:${srad};padding:14px">
          <div style="text-align:center"><strong style="color:${c.primary}">${data.years || '—'}+</strong><div style="font-size:.6rem;color:${c.muted}">YEARS</div></div>
          <div style="text-align:center"><strong style="color:${c.primary}">${data.courses?.length || '—'}</strong><div style="font-size:.6rem;color:${c.muted}">COURSES</div></div>
          <div style="text-align:center"><strong style="color:${c.accent}">${data.subject || '—'}</strong><div style="font-size:.6rem;color:${c.muted}">SUBJECT</div></div>
        </div>`);
    } else if (type === 'courses') {
      const items = (data.courses?.length ? data.courses : [data.subject || 'Your course']).map(
        co => `<div style="padding:12px;border:1px solid ${c.border};border-radius:${srad};background:${c.surface}"><strong style="font-size:.85rem">📘 ${co}</strong></div>`).join('');
      html = wrap(`${title('Courses')}${sub((data.courses || []).join(' · ') || 'Add courses in chat')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${items}</div>`, c.surface);
    } else if (type === 'philosophy') {
      html = wrap(`${title('Teaching Philosophy')}<div style="background:${c.surface};padding:14px 16px;border-left:4px solid ${c.primary};border-radius:0 ${srad} ${srad} 0;font-style:italic;font-size:.85rem">“${data.quote || 'Share a motto in chat…'}”</div>`);
    } else if (type === 'achievements') {
      html = wrap(`${title('Achievements')}<div style="padding:14px;border:1px solid ${c.border};border-radius:${srad};background:${c.surface}"><strong style="font-size:.85rem">${(data.achievements || 'Your achievements appear here').split(',')[0].slice(0, 80)}</strong></div>`, c.surface);
    } else if (type === 'contact') {
      html = wrap(`${title('Get in Touch')}${sub(`${data.email || 'you@school.edu'}${data.phone ? ' · ' + data.phone : ''}`)}`);
    }
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  function renderCustomCanvas(id: string) {
    const sec = customs.find(s => s.id === id);
    if (!sec) return null;
    const selected = sel?.kind === 'section' && sel.id === id;
    return (
      <div className={`relative ${selected ? 'ring-2 ring-inset ring-brand-400' : ''}`}>
        <div dangerouslySetInnerHTML={{ __html: renderSection(sec) }} />
        {/* block selection + drop overlay */}
        <div className="absolute inset-0">
          {(sec.blocks || []).length === 0 && (
            <div onDragOver={e => e.preventDefault()} onDrop={e => onDropAppendBlock(e, id)}
              className="absolute inset-0 flex items-center justify-center text-[0.68rem] text-slate-500 border border-dashed border-white/20 m-2 rounded-xl">
              Drop widgets here
            </div>
          )}
          <div className="absolute inset-0 flex flex-col">
            {(sec.blocks || []).map(b => {
              const active = sel?.kind === 'block' && sel.sectionId === id && sel.blockId === b.id;
              const meta = BLOCK_META.find(m => m.type === b.type);
              return (
                <div key={b.id} draggable
                  onDragStart={e => { e.dataTransfer.setData('application/x-studio', JSON.stringify({ kind: 'block-move', blockId: b.id, fromSection: id })); e.stopPropagation(); }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => onDropBlock(e, id, b.id)}
                  onClick={e => { e.stopPropagation(); setSel({ kind: 'block', sectionId: id, blockId: b.id }); }}
                  title={`${meta?.label || b.type} — drag to move, click to edit`}
                  className={`flex-1 min-h-[28px] cursor-pointer transition-all border ${active ? 'border-brand-400 bg-brand-500/10' : 'border-transparent hover:border-white/30 hover:bg-white/[0.04]'}`} />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function Inspector() {
    if (sel?.kind === 'block' && selBlock && selBlockSection) {
      const b = selBlock;
      return (
        <div>
          <InspectorHead icon="🧩" title={`${BLOCK_META.find(m => m.type === b.type)?.label || b.type} block`} onDelete={() => removeBlock(sel.sectionId, sel.blockId)} />
          <div className="flex gap-1.5 mb-4">
            <button onClick={() => moveBlock(sel.sectionId, sel.blockId, -1)} className="flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold bg-white/[0.04] border border-white/10 hover:border-white/25">↑ Up</button>
            <button onClick={() => moveBlock(sel.sectionId, sel.blockId, 1)} className="flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold bg-white/[0.04] border border-white/10 hover:border-white/25">↓ Down</button>
            <button onClick={() => duplicateBlock(sel.sectionId, sel.blockId)} className="flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold bg-white/[0.04] border border-white/10 hover:border-white/25">⧉ Copy</button>
          </div>
          <BlockFields block={b} onChange={patch => updateBlock(sel.sectionId, sel.blockId, patch)} />
        </div>
      );
    }
    if (sel?.kind === 'section' && selSection) {
      const s = selSection;
      return (
        <div>
          <InspectorHead icon="📄" title="Section" onDelete={() => removeCustomSection(s.id)} onDuplicate={() => duplicateCustomSection(s.id)} />
          <Field label="Title"><input className={inpCls} value={s.title || ''} onChange={e => updateCustom(s.id, { title: e.target.value })} /></Field>
          <Field label="Badge"><input className={inpCls} value={s.badge || ''} onChange={e => updateCustom(s.id, { badge: e.target.value })} /></Field>
          <Field label="Subtitle"><input className={inpCls} value={s.subtitle || ''} onChange={e => updateCustom(s.id, { subtitle: e.target.value })} /></Field>
          <Field label="Show header">
            <button onClick={() => updateCustom(s.id, { showHeader: s.showHeader === false })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${s.showHeader !== false ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-500'}`}>
              {s.showHeader !== false ? '✓ On' : '○ Off'}
            </button>
          </Field>
          <Field label="Columns / layout">
            <div className="grid grid-cols-3 gap-1.5">
              {LAYOUT_META.map(l => (
                <button key={l.id} title={l.desc} onClick={() => updateCustom(s.id, { layout: l.id })}
                  className={`px-2 py-1.5 rounded-lg text-[0.65rem] font-bold border ${s.layout === l.id ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400'}`}>{l.label}</button>
              ))}
            </div>
          </Field>
          <Field label="Background">
            <div className="flex gap-1.5 mb-1.5">
              {(['plain', 'alt', 'gradient', 'pattern'] as const).map(v => (
                <button key={v} onClick={() => updateCustom(s.id, { bgStyle: v })}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold border capitalize ${s.bgStyle === v ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400'}`}>{v}</button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(s.bg || '') ? s.bg : '#111827'} onChange={e => updateCustom(s.id, { bg: e.target.value })} className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              <input className={inpCls} value={s.bg || ''} onChange={e => updateCustom(s.id, { bg: e.target.value })} placeholder="#111827" />
            </div>
          </Field>
          <Field label="Padding">
            <div className="flex gap-1.5">{(['compact', 'normal', 'spacious'] as const).map(v => (
              <button key={v} onClick={() => updateCustom(s.id, { padding: v })} className={`flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold border capitalize ${s.padding === v ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400'}`}>{v}</button>
            ))}</div>
          </Field>
          <Field label="Corners">
            <div className="flex gap-1.5">{(['sharp', 'rounded', 'pill'] as const).map(v => (
              <button key={v} onClick={() => updateCustom(s.id, { radius: v })} className={`flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold border capitalize ${s.radius === v ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400'}`}>{v}</button>
            ))}</div>
          </Field>
          <Field label="Align">
            <div className="flex gap-1.5">{(['left', 'center'] as const).map(v => (
              <button key={v} onClick={() => updateCustom(s.id, { align: v })} className={`flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold border capitalize ${s.align === v ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400'}`}>{v}</button>
            ))}</div>
          </Field>
          <Field label="Custom CSS (scoped to this section)">
            <textarea className={`${inpCls} font-mono`} rows={3} value={s.customCss || ''}
              onChange={e => updateCustom(s.id, { customCss: e.target.value })}
              placeholder={'.csx-… h2 {\n  letter-spacing: 2px;\n}'} spellCheck={false} />
          </Field>
          <div className="flex gap-1.5 mb-3">
            <button onClick={() => copySection(s.id)} className="flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold bg-white/[0.04] border border-white/10 hover:border-white/25">
              {copiedTick > 0 ? '✓ Copied!' : '⧉ Copy section'}
            </button>
            <button onClick={pasteSection} className="flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold bg-white/[0.04] border border-white/10 hover:border-white/25">📋 Paste section</button>
          </div>
          <div className="text-[0.65rem] text-slate-500 mt-1">{(s.blocks || []).length} blocks — drag widgets from the left panel onto the section.</div>
        </div>
      );
    }
    if (sel?.kind === 'core') {
      return <CoreInspector ctype={sel.ctype} />;
    }
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-3">👈</div>
        <p className="text-xs font-bold text-slate-300 mb-1">Nothing selected</p>
        <p className="text-[0.68rem] text-slate-500 leading-relaxed">Click any section or block on the canvas to edit it. Drag ⋮⋮ handles to reorder like Elementor.</p>
      </div>
    );
  }

  function CoreInspector({ ctype }: { ctype: string }) {
    const cfg = cfgFor(ctype);
    const setCfg = (patch: Partial<LayoutSectionConfig>) => {
      const base = layout.length ? layout : defaultLayoutSections(customs.map(s => s.id));
      setLayout(base.map(l => (l.type === 'custom' ? l : l.type === ctype ? { ...l, ...patch } : l)));
    };
    const visKey = ctype as keyof NonNullable<TeacherData['visibility']>;
    const visible = ctype === 'hero' ? true : data.visibility?.[visKey] !== false;
    const setVisible = (v: boolean) => { setData(p => ({ ...p, visibility: { ...(p.visibility || {}), [visKey]: v } })); touch(); };
    const setF = (patch: Partial<TeacherData>) => { setData(p => ({ ...p, ...patch })); touch(); };
    const variants: Record<string, string[]> = {
      hero: ['default', 'minimal', 'split'], about: ['default', 'text-only', 'photo-right'],
      courses: ['default', 'list', 'compact'], philosophy: ['default', 'cards-only', 'statement'],
      achievements: ['default', 'timeline'], contact: ['default', 'centered', 'minimal'],
    };
    return (
      <div>
        <InspectorHead icon={CORE_META.find(m => m.type === ctype)?.icon || '📄'} title={`${CORE_META.find(m => m.type === ctype)?.label || ctype} section`} />
        {ctype === 'hero' && (
          <>
            <Field label="Name"><input className={inpCls} value={data.name} onChange={e => setF({ name: e.target.value })} /></Field>
            <Field label="Subject / tagline"><input className={inpCls} value={data.subject} onChange={e => setF({ subject: e.target.value })} /></Field>
            <Field label="Intro / bio"><textarea className={inpCls} rows={3} value={data.bio} onChange={e => setF({ bio: e.target.value })} />
              <PolishButton field="bio" text={data.bio} onPolished={t => setF({ bio: t })} />
            </Field>
            <Field label="Profile photo">
              <div className="flex items-center gap-2">
                {data.photo && <img src={data.photo} alt="" className="w-10 h-10 rounded-full object-cover border border-white/20" />}
                <input className={inpCls} value={data.photo} onChange={e => setF({ photo: e.target.value })} placeholder="https://… or upload" />
                <button onClick={() => { pendingImgTarget.current = 'photo'; inspectorUploadRef.current?.click(); }} className="px-2.5 py-2 rounded-lg text-xs bg-white/[0.05] border border-white/10 hover:border-white/30">📤</button>
              </div>
            </Field>
          </>
        )}
        {ctype === 'about' && (
          <>
            <Field label="Bio / lead"><textarea className={inpCls} rows={4} value={data.bio} onChange={e => setF({ bio: e.target.value })} />
              <PolishButton field="bio" text={data.bio} onPolished={t => setF({ bio: t })} />
            </Field>
            <Field label="Years teaching"><input className={inpCls} value={data.years} onChange={e => setF({ years: e.target.value })} /></Field>
          </>
        )}
        {ctype === 'courses' && (
          <>
            <Field label="Courses (one per line)">
              <textarea className={inpCls} rows={4} value={(data.courses || []).join('\n')}
                onChange={e => setF({ courses: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />
            </Field>
          </>
        )}
        {ctype === 'philosophy' && (
          <Field label="Teaching quote"><textarea className={inpCls} rows={3} value={data.quote} onChange={e => setF({ quote: e.target.value })} />
            <PolishButton field="quote" text={data.quote} onPolished={t => setF({ quote: t })} />
          </Field>
        )}
        {ctype === 'achievements' && (
          <Field label="Achievements"><textarea className={inpCls} rows={3} value={data.achievements} onChange={e => setF({ achievements: e.target.value })} />
            <PolishButton field="achievements" text={data.achievements} onPolished={t => setF({ achievements: t })} />
          </Field>
        )}
        {ctype === 'contact' && (
          <>
            <Field label="Email"><input className={inpCls} value={data.email} onChange={e => setF({ email: e.target.value })} /></Field>
            <Field label="Phone"><input className={inpCls} value={data.phone} onChange={e => setF({ phone: e.target.value })} /></Field>
          </>
        )}
        <Field label="Layout variant">
          <div className="flex gap-1.5 flex-wrap">
            {(variants[ctype] || ['default']).map(v => (
              <button key={v} onClick={() => setCfg({ variant: v })}
                className={`px-2.5 py-1.5 rounded-lg text-[0.65rem] font-bold border ${cfg?.variant === v || (!cfg?.variant && v === 'default') ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400'}`}>{v}</button>
            ))}
          </div>
        </Field>
        <Field label="Background color">
          <div className="flex gap-2 items-center">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(cfg?.bgColor || '') ? cfg!.bgColor! : '#111827'}
              onChange={e => setCfg({ bgColor: e.target.value })} className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            <input className={inpCls} value={cfg?.bgColor || ''} onChange={e => setCfg({ bgColor: e.target.value })} placeholder="transparent" />
            {!!cfg?.bgColor && <button onClick={() => setCfg({ bgColor: '' })} className="text-[0.65rem] text-slate-500 hover:text-white px-1">✕</button>}
          </div>
        </Field>
        <Field label="Spacing">
          <div className="flex gap-1.5">{(['compact', 'normal', 'spacious'] as const).map(v => (
            <button key={v} onClick={() => setCfg({ padding: v })} className={`flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold border capitalize ${cfg?.padding === v ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400'}`}>{v}</button>
          ))}</div>
        </Field>
        {ctype !== 'hero' && (
          <Field label="Visible on site">
            <button onClick={() => setVisible(!visible)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${visible ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-transparent border-white/10 text-slate-500'}`}>
              {visible ? '👁 Visible' : '👁‍🗨 Hidden'}
            </button>
          </Field>
        )}
      </div>
    );
  }
}

function InspectorHead({ icon, title, onDelete, onDuplicate }: { icon: string; title: string; onDelete?: () => void; onDuplicate?: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.07]">
      <span className="text-lg">{icon}</span>
      <span className="text-xs font-extrabold text-white flex-1 truncate">{title}</span>
      {onDuplicate && <button onClick={onDuplicate} title="Duplicate" className="w-7 h-7 rounded-lg text-xs bg-white/[0.04] border border-white/10 hover:border-white/30">⧉</button>}
      {onDelete && <button onClick={onDelete} title="Delete" className="w-7 h-7 rounded-lg text-xs bg-red-500/10 border border-red-500/25 text-red-300 hover:bg-red-500/20">🗑</button>}
    </div>
  );
}

function BlockFields({ block, onChange }: { block: SectionBlock; onChange: (p: Partial<SectionBlock>) => void }) {
  switch (block.type) {
    case 'heading':
      return (<>
        <Field label="Text"><input className={inpCls} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} /></Field>
        <Field label="Size"><div className="flex gap-1.5">{[1, 2, 3].map(l => (
          <button key={l} onClick={() => onChange({ level: l })} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border ${(block.level || 2) === l ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-transparent border-white/10 text-slate-400'}`}>H{l}</button>))}</div></Field>
      </>);
    case 'text':
      return <Field label="Text"><textarea className={inpCls} rows={4} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} />
        <PolishButton field="post" text={block.text || ''} onPolished={t => onChange({ text: t })} />
      </Field>;
    case 'image':
      return (<>
        <Field label="Image">
          {block.src && <img src={block.src} alt="" className="rounded-xl mb-2 max-h-32 w-full object-cover border border-white/15" />}
          <input className={inpCls} value={block.src || ''} onChange={e => onChange({ src: e.target.value })} placeholder="https://… or upload ↓" />
          <ImageUploadButtons onUpload={(url) => onChange({ src: url })} />
        </Field>
        <Field label="Alt text"><input className={inpCls} value={block.alt || ''} onChange={e => onChange({ alt: e.target.value })} /></Field>
      </>);
    case 'button':
      return (<>
        <Field label="Label"><input className={inpCls} value={block.label || ''} onChange={e => onChange({ label: e.target.value })} /></Field>
        <Field label="Link"><input className={inpCls} value={block.href || ''} onChange={e => onChange({ href: e.target.value })} placeholder="#contact" /></Field>
      </>);
    case 'card':
      return (<>
        <Field label="Icon (emoji)"><input className={inpCls} value={block.icon || ''} onChange={e => onChange({ icon: e.target.value })} /></Field>
        <Field label="Title"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} /></Field>
        <Field label="Text"><textarea className={inpCls} rows={3} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} /></Field>
      </>);
    case 'stat':
      return (<>
        <div className="flex gap-2">
          <div className="flex-1"><Field label="Number"><input className={inpCls} value={block.number || ''} onChange={e => onChange({ number: e.target.value })} /></Field></div>
          <div className="w-16"><Field label="Suffix"><input className={inpCls} value={block.suffix || ''} onChange={e => onChange({ suffix: e.target.value })} /></Field></div>
        </div>
        <Field label="Label"><input className={inpCls} value={block.label || ''} onChange={e => onChange({ label: e.target.value })} /></Field>
      </>);
    case 'list':
      return (
        <Field label="Items (one per line)">
          <textarea className={inpCls} rows={4} value={(block.items || []).join('\n')}
            onChange={e => onChange({ items: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />
        </Field>
      );
    case 'quote':
      return (<>
        <Field label="Quote"><textarea className={inpCls} rows={3} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} /></Field>
        <Field label="Attribution"><input className={inpCls} value={block.attribution || ''} onChange={e => onChange({ attribution: e.target.value })} /></Field>
      </>);
    case 'spacer':
      return <Field label="Height (px)"><input type="number" min={4} max={240} className={inpCls} value={block.text || '24'} onChange={e => onChange({ text: e.target.value })} /></Field>;
    case 'booking':
      return (<>
        <Field label="Heading"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Book a Meeting" /></Field>
        <Field label="Intro text"><textarea className={inpCls} rows={2} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} /></Field>
        <p className="text-[0.62rem] text-slate-600 leading-relaxed">Visitors pick a day + time from your availability (Dashboard → Bookings). Requests land in your inbox for confirmation.</p>
      </>);
    case 'file':
      return (<>
        <Field label="Label"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Course Syllabus" /></Field>
        <Field label="File URL">
          <input className={inpCls} value={block.src || ''} onChange={e => onChange({ src: e.target.value })} placeholder="https://… or upload a PDF ↓" />
          <label className="block mt-1.5 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold text-center bg-white/[0.05] border border-white/10 hover:border-white/30 cursor-pointer">
            📤 Upload PDF
            <input type="file" accept=".pdf,application/pdf" hidden onChange={async e => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (!f) return;
              const fd = new FormData();
              fd.append('file', f);
              fd.append('kind', 'file');
              const res = await fetch('/api/media', { method: 'POST', body: fd });
              const out = await res.json().catch(() => null);
              if (res.ok && out?.url) onChange({ src: out.url, title: block.title || f.name.replace(/\.pdf$/i, '') });
            }} />
          </label>
        </Field>
        <Field label="Note"><input className={inpCls} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} placeholder="Fall 2026 · 2 MB" /></Field>
      </>);
    case 'video':
      return (<>
        <Field label="Video URL"><input className={inpCls} value={block.src || ''} onChange={e => onChange({ src: e.target.value })} placeholder="YouTube / Vimeo / MP4 link" /></Field>
        <Field label="Caption (optional)"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} /></Field>
      </>);
    case 'faq': {
      const pairs = (block.items || []).map(it => {
        const i = it.indexOf('|||');
        return i < 0 ? { q: it, a: '' } : { q: it.slice(0, i), a: it.slice(i + 3) };
      });
      const setPairs = (next: { q: string; a: string }[]) => onChange({ items: next.map(p => `${p.q} ||| ${p.a}`) });
      return (<>
        <div className="flex flex-col gap-2 mb-2">
          {pairs.map((p, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
              <input className={inpCls + ' mb-1.5'} value={p.q} onChange={e => { const n = [...pairs]; n[i] = { ...n[i], q: e.target.value }; setPairs(n); }} placeholder={`Question ${i + 1}`} />
              <textarea className={inpCls} rows={2} value={p.a} onChange={e => { const n = [...pairs]; n[i] = { ...n[i], a: e.target.value }; setPairs(n); }} placeholder="Answer…" />
              <button onClick={() => setPairs(pairs.filter((_, j) => j !== i))} className="mt-1.5 text-[0.62rem] text-slate-600 hover:text-red-300">Remove</button>
            </div>
          ))}
        </div>
        <button onClick={() => setPairs([...pairs, { q: '', a: '' }])} className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-dashed border-white/15 hover:text-white">+ Add Q&A</button>
      </>);
    }
    case 'table':
      return (<>
        <Field label="Caption (optional)"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} /></Field>
        <Field label="Rows — cells separated by | (first row = header)">
          <textarea className={`${inpCls} font-mono`} rows={5} value={(block.items || []).join('\n')}
            onChange={e => onChange({ items: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} spellCheck={false} />
        </Field>
      </>);
    case 'countdown':
      return (<>
        <Field label="Event label"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Enrollment closes in" /></Field>
        <Field label="Target date & time">
          <input type="datetime-local" className={inpCls} value={(block.datetime || '').slice(0, 16)}
            onChange={e => onChange({ datetime: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
        </Field>
      </>);
    case 'map':
      return (<>
        <Field label="Heading (optional)"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} /></Field>
        <Field label="Address or embed URL"><input className={inpCls} value={block.src || ''} onChange={e => onChange({ src: e.target.value })} placeholder="123 School St, Springfield" /></Field>
      </>);
    case 'review-form':
      return (<>
        <Field label="Heading"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Share Your Experience" /></Field>
        <Field label="Intro text"><textarea className={inpCls} rows={2} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} /></Field>
        <p className="text-[0.62rem] text-slate-600 leading-relaxed">Submissions land in Dashboard → Audience for approval, then one click adds them to your site.</p>
      </>);
    case 'newsletter':
      return (<>
        <Field label="Heading"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Stay in the Loop" /></Field>
        <Field label="Intro text"><textarea className={inpCls} rows={2} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} /></Field>
        <p className="text-[0.62rem] text-slate-600 leading-relaxed">Signups collect in Dashboard → Audience, exportable as CSV.</p>
      </>);
    case 'html':
      return (
        <Field label="Custom HTML (scripts stripped on publish)">
          <textarea className={`${inpCls} font-mono`} rows={6} value={block.html || ''}
            onChange={e => onChange({ html: e.target.value })}
            placeholder={'<div style="...">\n  ...\n</div>'} spellCheck={false} />
        </Field>
      );
    case 'file':
      return (<>
        <Field label="Label"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Course Syllabus" /></Field>
        <Field label="File URL">
          <input className={inpCls} value={block.src || ''} onChange={e => onChange({ src: e.target.value })} placeholder="https://… or upload a PDF ↓" />
          <label className="block mt-1.5 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold text-center bg-white/[0.05] border border-white/10 hover:border-white/30 cursor-pointer">
            📤 Upload PDF
            <input type="file" accept=".pdf,application/pdf" hidden onChange={async e => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (!f) return;
              const fd = new FormData();
              fd.append('file', f);
              fd.append('kind', 'file');
              const res = await fetch('/api/media', { method: 'POST', body: fd });
              const out = await res.json().catch(() => null);
              if (res.ok && out?.url) onChange({ src: out.url, title: block.title || f.name.replace(/\.pdf$/i, '') });
            }} />
          </label>
        </Field>
        <Field label="Note"><input className={inpCls} value={block.text || ''} onChange={e => onChange({ text: e.target.value })} placeholder="Fall 2026 · 2 MB" /></Field>
      </>);
    case 'video':
      return (<>
        <Field label="Video URL"><input className={inpCls} value={block.src || ''} onChange={e => onChange({ src: e.target.value })} placeholder="YouTube / Vimeo / MP4 link" /></Field>
        <Field label="Caption (optional)"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} /></Field>
      </>);
    case 'faq': {
      const pairs = (block.items || []).map(it => {
        const i = it.indexOf('|||');
        return i < 0 ? { q: it, a: '' } : { q: it.slice(0, i), a: it.slice(i + 3) };
      });
      const setPairs = (next: { q: string; a: string }[]) => onChange({ items: next.map(p => `${p.q} ||| ${p.a}`) });
      return (<>
        <div className="flex flex-col gap-2 mb-2">
          {pairs.map((p, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
              <input className={inpCls + ' mb-1.5'} value={p.q} onChange={e => { const n = [...pairs]; n[i] = { ...n[i], q: e.target.value }; setPairs(n); }} placeholder={`Question ${i + 1}`} />
              <textarea className={inpCls} rows={2} value={p.a} onChange={e => { const n = [...pairs]; n[i] = { ...n[i], a: e.target.value }; setPairs(n); }} placeholder="Answer…" />
              <button onClick={() => setPairs(pairs.filter((_, j) => j !== i))} className="mt-1.5 text-[0.62rem] text-slate-600 hover:text-red-300">Remove</button>
            </div>
          ))}
        </div>
        <button onClick={() => setPairs([...pairs, { q: '', a: '' }])} className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-dashed border-white/15 hover:text-white">+ Add Q&A</button>
      </>);
    }
    case 'table':
      return (<>
        <Field label="Caption (optional)"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} /></Field>
        <Field label="Rows — cells separated by | (first row = header)">
          <textarea className={`${inpCls} font-mono`} rows={5} value={(block.items || []).join('\n')}
            onChange={e => onChange({ items: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} spellCheck={false} />
        </Field>
      </>);
    case 'countdown':
      return (<>
        <Field label="Event label"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} placeholder="Enrollment closes in" /></Field>
        <Field label="Target date & time">
          <input type="datetime-local" className={inpCls} value={(block.datetime || '').slice(0, 16)}
            onChange={e => onChange({ datetime: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
        </Field>
      </>);
    case 'map':
      return (<>
        <Field label="Heading (optional)"><input className={inpCls} value={block.title || ''} onChange={e => onChange({ title: e.target.value })} /></Field>
        <Field label="Address or embed URL"><input className={inpCls} value={block.src || ''} onChange={e => onChange({ src: e.target.value })} placeholder="123 School St, Springfield" /></Field>
      </>);
    default:
      return <p className="text-[0.68rem] text-slate-500">No editable settings for divider blocks.</p>;
  }
}

/** Site audit modal — score + grouped issues with fix hints. */
function AuditModal({ data, onClose }: { data: TeacherData; onClose: () => void }) {
  const report = useMemo(() => auditSite(data), [data]);
  const groups = [
    { level: 'error' as const, label: 'Must fix', icon: '🔴' },
    { level: 'warn' as const, label: 'Should improve', icon: '🟡' },
    { level: 'pass' as const, label: 'Looking good', icon: '🟢' },
  ];
  const ring = report.score >= 85 ? 'text-emerald-300 border-emerald-500/50' : report.score >= 60 ? 'text-amber-300 border-amber-500/50' : 'text-red-300 border-red-500/50';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-[#0d1119] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
          <span className="text-sm font-extrabold text-white">✓ Site audit</span>
          <span className={`ml-auto w-11 h-11 rounded-full border-2 ${ring} inline-flex items-center justify-center text-sm font-black`}>{report.score}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white px-1">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {groups.map(g => {
            const items = report.issues.filter(i => i.level === g.level);
            if (!items.length) return null;
            return (
              <div key={g.level}>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{g.icon} {g.label} ({items.length})</p>
                <div className="flex flex-col gap-1.5">
                  {items.map((it, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <div className="text-xs font-bold text-slate-200">{it.title}</div>
                      {it.detail && <div className="text-[0.68rem] text-slate-500 mt-0.5">{it.detail}</div>}
                      {it.fix && <div className="text-[0.62rem] text-brand-300 mt-1">Fix → {it.fix}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="px-5 py-3 text-[0.62rem] text-slate-600 border-t border-white/[0.07]">Score updates live as you edit. Publish to ship the fixes.</p>
      </div>
    </div>
  );
}

/** One-click AI rewrite for text fields (Ollama-backed, honest errors). */
function PolishButton({ field, text, onPolished }: { field: string; text: string; onPolished: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!text.trim()) return null;
  return (
    <span className="inline-flex items-center gap-1.5 mt-1.5">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr('');
          try {
            const r = await fetch('/api/polish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field, text }),
            });
            const j = await r.json().catch(() => null);
            if (!r.ok) throw new Error(j?.error || 'polish failed');
            onPolished(j.text);
          } catch (e: any) {
            setErr(e.message || 'Polish failed.');
          }
          setBusy(false);
        }}
        className="px-2.5 py-1 rounded-lg text-[0.62rem] font-bold text-brand-200 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 disabled:opacity-50 transition-all"
      >
        {busy ? '✨ Polishing…' : '✨ Polish with AI'}
      </button>
      {err && <span className="text-[0.62rem] text-amber-300">{err}</span>}
    </span>
  );
}

/** Upload button for image blocks. */
function ImageUploadButtons({ onUpload }: { onUpload: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex gap-1.5 mt-1.5">
      <label className="flex-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-bold text-center bg-white/[0.05] border border-white/10 hover:border-white/30 cursor-pointer">
        {busy ? 'Uploading…' : '📤 Upload'}
        <input type="file" accept={ACCEPT} hidden onChange={async e => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            const fd = new FormData();
            fd.append('file', f);
            const res = await fetch('/api/media', { method: 'POST', body: fd });
            const out = await res.json().catch(() => null);
            if (res.ok && out?.url) onUpload(out.url);
          } catch {}
          setBusy(false);
        }} />
      </label>
      <span className="flex-1 px-2 py-1.5 rounded-lg text-[0.62rem] text-slate-500 border border-dashed border-white/10 text-center">or pick in 🖼 Media tab</span>
    </div>
  );
}
