import { describe, it, expect } from 'vitest';
import {
  histPush, histUndo, histRedo, canUndo, canRedo,
  sanitizeImportedPage, buildExportDoc,
} from '../lib/studioUtils';
import { scopeCss, newBlock } from '../lib/sections';

describe('undo/redo stacks', () => {
  it('pushes distinct snapshots and collapses repeats', () => {
    let h = { past: [] as string[], future: [] as string[] };
    h = histPush(h, 'a');
    h = histPush(h, 'a');
    h = histPush(h, 'b');
    expect(h.past).toEqual(['a', 'b']);
    expect(h.future).toEqual([]);
  });

  it('caps the stack', () => {
    let h = { past: [] as string[], future: [] as string[] };
    for (let i = 0; i < 70; i++) h = histPush(h, `s${i}`);
    expect(h.past.length).toBe(60);
    expect(h.past[0]).toBe('s10');
  });

  it('undoes to the newest distinct snapshot and redoes', () => {
    const h = { past: ['a', 'b', 'c'], future: [] as string[] };
    const u = histUndo(h, 'c');
    expect(u.value).toBe('b');
    expect(u.state.future).toEqual(['c']);
    const r = histRedo(u.state, 'b');
    expect(r.value).toBe('c');
  });

  it('skips duplicate tops and reports emptiness', () => {
    const u = histUndo({ past: ['a'], future: [] }, 'a');
    expect(u.value).toBeNull();
    expect(canUndo({ past: ['a'], future: [] }, 'a')).toBe(false);
    expect(canUndo({ past: ['a', 'b'], future: [] }, 'b')).toBe(true);
    expect(canRedo({ past: [], future: [] })).toBe(false);
    expect(canRedo({ past: [], future: ['x'] })).toBe(true);
  });
});

describe('sanitizeImportedPage', () => {
  it('accepts a bare TeacherData object', () => {
    const r = sanitizeImportedPage({ name: 'Jane', courses: ['Math'], theme: 'warm' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.name).toBe('Jane');
      expect(r.data.courses).toEqual(['Math']);
      expect(r.data.gallery).toEqual([]);
    }
  });

  it('accepts the export envelope', () => {
    const r = sanitizeImportedPage({ app: 'teacherfolio-studio', data: { name: 'Bo' } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.name).toBe('Bo');
  });

  it('rejects garbage', () => {
    expect(sanitizeImportedPage(null).ok).toBe(false);
    expect(sanitizeImportedPage([]).ok).toBe(false);
    expect(sanitizeImportedPage({ title: 'no name here' }).ok).toBe(false);
    expect(sanitizeImportedPage('nope').ok).toBe(false);
  });

  it('normalizes non-array collections', () => {
    const r = sanitizeImportedPage({ name: 'Bo', courses: 'Math', gallery: 'x' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.courses).toEqual([]);
      expect(r.data.gallery).toEqual([]);
    }
  });
});

describe('buildExportDoc', () => {
  it('wraps data with app metadata', () => {
    const doc = buildExportDoc({ name: 'Jane' } as any);
    expect(doc.app).toBe('teacherfolio-studio');
    expect(doc.data.name).toBe('Jane');
    expect(typeof doc.exportedAt).toBe('string');
  });
});

describe('scopeCss', () => {
  it('prefixes bare selectors with the section class', () => {
    const out = scopeCss('h2 { color: red; } .card, p { margin: 0; }', 'csx-1');
    expect(out).toContain('.csx-1 h2');
    expect(out).toContain('.csx-1 .card');
    expect(out).toContain('.csx-1 p');
  });

  it('leaves at-rules, keyframes and pre-scoped selectors alone', () => {
    const out = scopeCss('@media(max-width:600px){h2{color:blue}} @keyframes x{from{opacity:0}} .csx-1 h2{color:red}', 'csx-1');
    expect(out).toContain('@media(max-width:600px){.csx-1 h2');
    expect(out).toContain('@keyframes x{from{opacity:0}}');
    expect(out).not.toContain('.csx-1 .csx-1');
  });

  it('strips comments, scripts and style breakouts', () => {
    const out = scopeCss('/* hi */ h2{color:red}</style><script>alert(1)</script>', 'csx-9');
    expect(out).not.toContain('/*');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('</style');
    expect(out).toContain('.csx-9 h2');
  });
});

describe('html block', () => {
  it('creates an html block with placeholder markup', () => {
    const b = newBlock('html');
    expect(b.type).toBe('html');
    expect(typeof b.html).toBe('string');
  });
});
