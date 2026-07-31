'use client';

import { useMemo, useState } from 'react';
import { useCMS } from '../CMSContext';
import { recommendSectionTemplates } from '@/lib/sectionRecommend';
import { SECTION_TEMPLATES, findTemplate } from '@/lib/sectionTemplates';
import {
  CustomSection, SectionBlock, BlockType, BLOCK_META, LAYOUT_META,
  newBlock, makeId, renderSection,
} from '@/lib/sections';

function Empty() { return null; }

export function SectionsTab() {
  const { data, update, showToast } = useCMS();
  const sections: CustomSection[] = data.customSections || [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const setSections = (next: CustomSection[]) => update('customSections', next);

  const recs = useMemo(() => recommendSectionTemplates(data), [data]);

  const addTemplate = (templateId: string, fromRec = false) => {
    const tpl = findTemplate(templateId);
    if (!tpl) return;
    const s = tpl.make();
    setSections([...sections, s]);
    setEditingId(s.id);
    showToast(fromRec ? `Added recommended section: ${tpl.name}` : `Added: ${tpl.name}`);
  };

  const patchSection = (id: string, patch: Partial<CustomSection>) => {
    setSections(sections.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const duplicateSection = (id: string) => {
    const src = sections.find(s => s.id === id);
    if (!src) return;
    const copy: CustomSection = {
      ...JSON.parse(JSON.stringify(src)),
      id: makeId(),
      title: src.title + ' (copy)',
      blocks: src.blocks.map(b => ({ ...b, id: makeId() })),
    };
    const idx = sections.findIndex(s => s.id === id);
    const next = [...sections];
    next.splice(idx + 1, 0, copy);
    setSections(next);
    setEditingId(copy.id);
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex(s => s.id === id);
    const to = idx + dir;
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    [next[idx], next[to]] = [next[to], next[idx]];
    setSections(next);
  };

  // block ops
  const addBlock = (secId: string, type: BlockType) => {
    const sec = sections.find(s => s.id === secId);
    if (!sec) return;
    const block = newBlock(type);
    patchSection(secId, { blocks: [...sec.blocks, block] });
    setExpandedBlocks(prev => ({ ...prev, [block.id]: true }));
  };

  const patchBlock = (secId: string, blockId: string, patch: Partial<SectionBlock>) => {
    const sec = sections.find(s => s.id === secId);
    if (!sec) return;
    patchSection(secId, { blocks: sec.blocks.map(b => (b.id === blockId ? { ...b, ...patch } : b)) });
  };

  const removeBlock = (secId: string, blockId: string) => {
    const sec = sections.find(s => s.id === secId);
    if (!sec) return;
    patchSection(secId, { blocks: sec.blocks.filter(b => b.id !== blockId) });
  };

  const moveBlock = (secId: string, blockId: string, dir: -1 | 1) => {
    const sec = sections.find(s => s.id === secId);
    if (!sec) return;
    const idx = sec.blocks.findIndex(b => b.id === blockId);
    const to = idx + dir;
    if (to < 0 || to >= sec.blocks.length) return;
    const blocks = [...sec.blocks];
    [blocks[idx], blocks[to]] = [blocks[to], blocks[idx]];
    patchSection(secId, { blocks });
  };

  const toggleBlock = (id: string) => setExpandedBlocks(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="cms-panel">
      <div className="cms-panel__header">
        <h2>Section Designer</h2>
        <p>Design your own sections — any shape, any size. Start from a recommendation or a template, then customize every block.</p>
      </div>

      {recs.length > 0 && (
        <div className="cms-section">
          <div className="cms-section__title">✨ Recommended for you</div>
          <p className="text-sm text-slate-400 mb-3">Based on your content, these sections would strengthen your portfolio.</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
            {recs.map(r => (
              <div key={r.templateId} className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-4 flex flex-col gap-2 hover:border-brand-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-300">{findTemplate(r.templateId)?.icon} {findTemplate(r.templateId)?.name}</span>
                  <span className="text-[0.65rem] font-bold text-emerald-400">{r.score}%</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed m-0 flex-1">{r.reason}</p>
                <button className="cms-btn cms-btn--primary cms-btn--small w-full" onClick={() => addTemplate(r.templateId, true)}>+ Add Section</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cms-section">
        <div className="cms-section__title">Template Gallery</div>
        <p className="text-sm text-slate-400 mb-3">Pick a starting point — you can edit every detail after.</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {SECTION_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => addTemplate(t.id)} className="text-left rounded-xl bg-surface-800/50 border border-white/10 p-4 flex flex-col gap-1.5 hover:border-brand-500/40 hover:bg-surface-800 transition-colors">
              <span className="text-xl">{t.icon}</span>
              <strong className="text-xs text-slate-200">{t.name}</strong>
              <span className="text-[0.68rem] text-slate-500 leading-snug">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cms-section">
        <div className="cms-section__title">Your Sections ({sections.length})</div>
        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-10 text-center">
            <div className="text-3xl mb-2">🧩</div>
            <p className="text-sm text-slate-400 m-0">No custom sections yet. Add one from the recommendations or gallery above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sections.map((sec, i) => (
              <SectionEditor
                key={sec.id}
                section={sec}
                index={i}
                total={sections.length}
                expanded={editingId === sec.id}
                expandedBlocks={expandedBlocks}
                onToggle={() => setEditingId(editingId === sec.id ? null : sec.id)}
                onPatch={patchSection}
                onRemove={removeSection}
                onDuplicate={duplicateSection}
                onMove={moveSection}
                onAddBlock={addBlock}
                onPatchBlock={patchBlock}
                onRemoveBlock={removeBlock}
                onMoveBlock={moveBlock}
                onToggleBlock={toggleBlock}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionEditor(props: {
  section: CustomSection;
  index: number;
  total: number;
  expanded: boolean;
  expandedBlocks: Record<string, boolean>;
  onToggle: () => void;
  onPatch: (id: string, patch: Partial<CustomSection>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onAddBlock: (secId: string, type: BlockType) => void;
  onPatchBlock: (secId: string, blockId: string, patch: Partial<SectionBlock>) => void;
  onRemoveBlock: (secId: string, blockId: string) => void;
  onMoveBlock: (secId: string, blockId: string, dir: -1 | 1) => void;
  onToggleBlock: (id: string) => void;
}) {
  const { section: s, index, total, expanded, expandedBlocks } = props;
  const { onToggle, onPatch, onRemove, onDuplicate, onMove, onAddBlock, onPatchBlock, onRemoveBlock, onMoveBlock, onToggleBlock } = props;
  const layoutLabel = LAYOUT_META.find(l => l.id === s.layout)?.label || s.layout;

  return (
    <div className="rounded-xl border border-white/10 bg-surface-800/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-800/70">
        <div className="flex flex-col gap-0.5 mr-1">
          <button onClick={() => onMove(s.id, -1)} disabled={index === 0} className="text-[0.6rem] text-slate-400 hover:text-white disabled:opacity-30 leading-none">▲</button>
          <button onClick={() => onMove(s.id, 1)} disabled={index === total - 1} className="text-[0.6rem] text-slate-400 hover:text-white disabled:opacity-30 leading-none">▼</button>
        </div>
        <div className="flex-1 min-w-0">
          <strong className="text-sm text-slate-200 block truncate">{s.title || 'Untitled section'}</strong>
          <span className="text-[0.65rem] text-slate-500">{layoutLabel} · {s.blocks.length} blocks</span>
        </div>
        <button className="cms-btn cms-btn--secondary cms-btn--small" onClick={() => onDuplicate(s.id)}>⧉</button>
        <button className="cms-btn cms-btn--danger cms-btn--small" onClick={() => onRemove(s.id)}>✕</button>
        <button className="cms-btn cms-btn--secondary cms-btn--small" onClick={onToggle}>{expanded ? '−' : '+'}</button>
      </div>

      {expanded && (
        <div className="p-4 grid gap-5" style={{ gridTemplateColumns: '1fr 260px' }}>
          <div className="flex flex-col gap-5 min-w-0">
            <div className="flex flex-col gap-2">
              <label className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Content</label>
              <input className="cms-input" value={s.title || ''} placeholder="Section title" onChange={e => onPatch(s.id, { title: e.target.value })} />
              <div className="flex gap-2">
                <input className="cms-input" value={s.badge || ''} placeholder="Badge (e.g. Research)" onChange={e => onPatch(s.id, { badge: e.target.value })} />
              </div>
              <input className="cms-input" value={s.subtitle || ''} placeholder="Subtitle (optional)" onChange={e => onPatch(s.id, { subtitle: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" checked={s.showHeader !== false} onChange={e => onPatch(s.id, { showHeader: e.target.checked })} />Show header</label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Layout & Shape</label>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {LAYOUT_META.map(l => (
                  <button key={l.id} onClick={() => onPatch(s.id, { layout: l.id })} title={l.desc} className={`text-[0.68rem] px-2 py-2 rounded-lg border transition-colors ${s.layout === l.id ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'border-white/10 text-slate-400 hover:border-white/25'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Blocks ({s.blocks.length})</label>
              <div className="flex flex-col gap-2">
                {s.blocks.map((b, bi) => (
                  <div key={b.id} className="rounded-lg border border-white/10 bg-surface-800/60">
                    <div className="flex items-center gap-1.5 px-3 py-2">
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button onClick={() => onMoveBlock(s.id, b.id, -1)} disabled={bi === 0} className="text-[0.55rem] text-slate-500 hover:text-white disabled:opacity-30 leading-none">▲</button>
                        <button onClick={() => onMoveBlock(s.id, b.id, 1)} disabled={bi === s.blocks.length - 1} className="text-[0.55rem] text-slate-500 hover:text-white disabled:opacity-30 leading-none">▼</button>
                      </div>
                      <span className="text-sm">{BLOCK_META.find(m => m.type === b.type)?.icon}</span>
                      <span className="text-xs text-slate-300 flex-1 truncate">{BLOCK_META.find(m => m.type === b.type)?.label}</span>
                      <button className="text-[0.65rem] text-slate-500 hover:text-white px-1" onClick={() => onToggleBlock(b.id)}>{expandedBlocks[b.id] ? '▴' : '▾'}</button>
                      <button className="text-[0.65rem] text-red-400 hover:text-red-300 px-1" onClick={() => onRemoveBlock(s.id, b.id)}>✕</button>
                    </div>
                    {expandedBlocks[b.id] && (
                      <div className="px-3 pb-3 flex flex-col gap-2">
                        <BlockFields block={b} onChange={(patch) => onPatchBlock(s.id, b.id, patch)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {BLOCK_META.map(m => (
                  <button key={m.type} onClick={() => onAddBlock(s.id, m.type)} className="text-[0.65rem] px-2 py-1 rounded-full border border-white/10 text-slate-400 hover:border-brand-500/40 hover:text-brand-300 transition-colors">
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-0">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Appearance</label>
            <div className="flex flex-col gap-2">
              <label className="text-[0.7rem] text-slate-500">Background</label>
              <select className="cms-input" value={s.bgStyle} onChange={e => onPatch(s.id, { bgStyle: e.target.value as any })}>
                <option value="plain">Plain</option>
                <option value="alt">Alt (dark band)</option>
                <option value="gradient">Gradient</option>
                <option value="pattern">Pattern</option>
              </select>
              {s.bgStyle === 'alt' || s.bgStyle === 'plain' ? (
                <div className="flex gap-2 items-center">
                  <input type="color" value={s.bg === 'transparent' ? '#111827' : (s.bg || '#111827')} onChange={e => onPatch(s.id, { bg: e.target.value })} className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                  <input className="cms-input" value={s.bg === 'transparent' ? '' : (s.bg || '')} placeholder="#111827" onChange={e => onPatch(s.id, { bg: e.target.value })} />
                </div>
              ) : s.bgStyle === 'pattern' ? (
                <div className="flex flex-col gap-2">
                  <select className="cms-input" value={s.pattern || 'dots'} onChange={e => onPatch(s.id, { pattern: e.target.value })}>
                    <option value="dots">Dots</option>
                    <option value="grid">Grid</option>
                    <option value="waves">Waves</option>
                    <option value="diagonal">Diagonal</option>
                  </select>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={s.bg || '#111827'} onChange={e => onPatch(s.id, { bg: e.target.value })} className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                    <input className="cms-input" value={s.bg || ''} placeholder="#111827" onChange={e => onPatch(s.id, { bg: e.target.value })} />
                  </div>
                </div>
              ) : null}

              <label className="text-[0.7rem] text-slate-500 mt-1">Padding</label>
              <select className="cms-input" value={s.padding} onChange={e => onPatch(s.id, { padding: e.target.value as any })}>
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="spacious">Spacious</option>
              </select>

              <label className="text-[0.7rem] text-slate-500">Corners</label>
              <select className="cms-input" value={s.radius} onChange={e => onPatch(s.id, { radius: e.target.value as any })}>
                <option value="sharp">Sharp</option>
                <option value="rounded">Rounded</option>
                <option value="pill">Pill</option>
              </select>

              <label className="text-[0.7rem] text-slate-500">Max width</label>
              <select className="cms-input" value={s.maxWidth} onChange={e => onPatch(s.id, { maxWidth: e.target.value as any })}>
                <option value="narrow">Narrow</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
                <option value="full">Full</option>
              </select>

              <label className="text-[0.7rem] text-slate-500">Alignment</label>
              <div className="flex gap-1.5">
                {(['left', 'center'] as const).map(a => (
                  <button key={a} onClick={() => onPatch(s.id, { align: a })} className={`flex-1 text-[0.68rem] px-2 py-1.5 rounded-lg border transition-colors ${s.align === a ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'border-white/10 text-slate-400 hover:border-white/25'}`}>
                    {a === 'left' ? 'Left' : 'Center'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-surface-900/40 overflow-hidden mt-1">
              <div className="px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 border-b border-white/10 bg-surface-800/60">Live preview</div>
              <div className="max-h-[420px] overflow-auto [&_section]:!py-4 [&_.container]:!max-w-[240px] [&_img]:!min-h-0">
                <div dangerouslySetInnerHTML={{ __html: renderSection(s) }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockFields({ block, onChange }: { block: SectionBlock; onChange: (patch: Partial<SectionBlock>) => void }) {
  switch (block.type) {
    case 'heading':
      return (
        <>
          <input className="cms-input" value={block.text || ''} placeholder="Heading text" onChange={e => onChange({ text: e.target.value })} />
          <select className="cms-input" value={block.level || 2} onChange={e => onChange({ level: parseInt(e.target.value) })}>
            <option value={2}>Heading 2</option>
            <option value={3}>Heading 3</option>
          </select>
        </>
      );
    case 'text':
      return <textarea className="cms-textarea" rows={3} value={block.text || ''} placeholder="Paragraph text" onChange={e => onChange({ text: e.target.value })} />;
    case 'image':
      return (
        <>
          <input className="cms-input" value={block.src || ''} placeholder="Image URL" onChange={e => onChange({ src: e.target.value })} />
          <input className="cms-input" value={block.alt || ''} placeholder="Alt text" onChange={e => onChange({ alt: e.target.value })} />
        </>
      );
    case 'button':
      return (
        <>
          <input className="cms-input" value={block.label || ''} placeholder="Button label" onChange={e => onChange({ label: e.target.value })} />
          <input className="cms-input" value={block.href || ''} placeholder="Link (#contact)" onChange={e => onChange({ href: e.target.value })} />
        </>
      );
    case 'card':
      return (
        <>
          <input className="cms-input" value={block.icon || ''} placeholder="Icon (emoji)" onChange={e => onChange({ icon: e.target.value })} />
          <input className="cms-input" value={block.title || ''} placeholder="Card title" onChange={e => onChange({ title: e.target.value })} />
          <textarea className="cms-textarea" rows={2} value={block.text || ''} placeholder="Card text" onChange={e => onChange({ text: e.target.value })} />
        </>
      );
    case 'stat':
      return (
        <>
          <div className="flex gap-2">
            <input className="cms-input" value={block.number || ''} placeholder="Number" onChange={e => onChange({ number: e.target.value })} />
            <input className="cms-input" value={block.suffix || ''} placeholder="+" onChange={e => onChange({ suffix: e.target.value })} />
          </div>
          <input className="cms-input" value={block.label || ''} placeholder="Label" onChange={e => onChange({ label: e.target.value })} />
        </>
      );
    case 'list':
      return (
        <>
          {(block.items || ['']).map((it, i) => (
            <div key={i} className="flex gap-2">
              <input className="cms-input" value={it} placeholder={`Item ${i + 1}`} onChange={e => {
                const items = [...(block.items || [''])];
                items[i] = e.target.value;
                onChange({ items });
              }} />
              {block.items!.length > 1 && (
                <button className="cms-btn cms-btn--danger cms-btn--small" onClick={() => onChange({ items: block.items!.filter((_, j) => j !== i) })}>✕</button>
              )}
            </div>
          ))}
          <button className="cms-btn cms-btn--secondary cms-btn--small self-start" onClick={() => onChange({ items: [...(block.items || []), ''] })}>+ Item</button>
        </>
      );
    case 'quote':
      return (
        <>
          <textarea className="cms-textarea" rows={2} value={block.text || ''} placeholder="Quote text" onChange={e => onChange({ text: e.target.value })} />
          <input className="cms-input" value={block.attribution || ''} placeholder="Attribution" onChange={e => onChange({ attribution: e.target.value })} />
        </>
      );
    case 'spacer':
      return (
        <div className="flex items-center gap-2">
          <label className="text-[0.7rem] text-slate-500 whitespace-nowrap">Height</label>
          <input className="cms-input" type="number" min={4} max={200} value={block.text || '24'} onChange={e => onChange({ text: e.target.value })} />
          <span className="text-[0.7rem] text-slate-500">px</span>
        </div>
      );
    default:
      return <Empty />;
  }
}
