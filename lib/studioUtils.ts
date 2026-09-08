import { emptyData, type TeacherData } from './conversation';

/** Bounded undo/redo stacks over JSON snapshots (pure + unit-tested). */
export interface HistState {
  past: string[];
  future: string[];
}

export function histPush(h: HistState, snap: string, cap = 60): HistState {
  if (h.past[h.past.length - 1] === snap) return h;
  const past = [...h.past, snap];
  while (past.length > cap) past.shift();
  return { past, future: [] };
}

/** Undo: current snapshot moves to future, newest distinct past entry is restored. */
export function histUndo(h: HistState, current: string): { state: HistState; value: string | null } {
  const past = [...h.past];
  let value: string | null = null;
  while (past.length > 0) {
    const top = past[past.length - 1];
    if (top !== current) {
      value = top;
      break;
    }
    past.pop();
  }
  if (value === null) return { state: h, value: null };
  past.pop();
  return { state: { past, future: [...h.future, current] }, value };
}

/** Redo: newest future entry is restored. */
export function histRedo(h: HistState, current: string): { state: HistState; value: string | null } {
  const future = [...h.future];
  const value = future.pop() ?? null;
  if (value === null) return { state: h, value: null };
  if (value === current) return { state: { past: h.past, future }, value: null };
  const past = [...h.past, current];
  while (past.length > 60) past.shift();
  return { state: { past, future }, value };
}

export function canUndo(h: HistState, current: string): boolean {
  return h.past.some(s => s !== current);
}

export function canRedo(h: HistState): boolean {
  return h.future.length > 0;
}

export type ImportResult = { ok: true; data: TeacherData } | { ok: false; error: string };

/** Validate + normalize an imported Studio JSON document. */
export function sanitizeImportedPage(raw: unknown): ImportResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Not a page object.' };
  }
  const obj = raw as Record<string, unknown>;
  const doc = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Record<string, unknown>;
  if (typeof doc.name !== 'string') {
    return { ok: false, error: 'Missing teacher name — is this a TeacherFolio export?' };
  }
  const data: TeacherData = {
    ...emptyData,
    gallery: [],
    ...(doc as Partial<TeacherData>),
  };
  if (!Array.isArray(data.courses)) data.courses = [];
  if (!Array.isArray(data.gallery)) data.gallery = [];
  if (data.customSections !== undefined && !Array.isArray(data.customSections)) data.customSections = [];
  if (typeof data.name !== 'string' || data.name.length > 200) {
    return { ok: false, error: 'Invalid teacher name in file.' };
  }
  return { ok: true, data };
}

/** Build a downloadable export document (never includes secrets). */
export function buildExportDoc(data: TeacherData) {
  return {
    app: 'teacherfolio-studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}
