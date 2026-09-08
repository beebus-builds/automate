import path from 'path';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DOC_BYTES = 25 * 1024 * 1024; // 25 MB for PDFs
export const MAX_MESSAGE_TEXT = 2000;
export const MAX_MESSAGE_SENDER = 80;

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico']);

/** Magic-byte signatures for the raster formats we accept. */
const MAGIC: Record<string, (buf: Buffer) => boolean> = {
  png: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  gif: (b) => b.length >= 4 && b.toString('ascii', 0, 4) === 'GIF8',
  webp: (b) =>
    b.length >= 12 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP',
  ico: (b) => b.length >= 4 && b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0,
};

/** Validate an uploaded file: returns the safe extension or null if rejected. */
export function validateUpload(buffer: Buffer, originalName: string): { ext: string } | null {
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) return null;

  const rawExt = (path.extname(originalName || '').replace(/^\./, '') || '').toLowerCase();
  const ext = ALLOWED_EXTENSIONS.has(rawExt) && MAGIC[rawExt](buffer) ? rawExt : null;
  return ext ? { ext } : null;
}

/** Validate a document upload (currently PDFs only): magic bytes + size cap. */
export function validateDocument(buffer: Buffer, originalName: string): { ext: string } | null {
  if (buffer.length === 0 || buffer.length > MAX_DOC_BYTES) return null;
  const rawExt = (path.extname(originalName || '').replace(/^\./, '') || '').toLowerCase();
  if (rawExt !== 'pdf') return null;
  if (buffer.length < 5 || buffer.toString('ascii', 0, 5) !== '%PDF-') return null;
  return { ext: 'pdf' };
}

export function sanitizeFileName(name: string): string {
  const clean = (name || '')
    .replace(/[\\/]/g, '')
    .replace(/[^\w.\- (),&+']/g, '')
    .trim()
    .slice(0, 100);
  return clean || 'file';
}

/** HTML-aware sanitizer for user text stored and re-rendered later.
 * Preserves apostrophes/quotes (O'Brien, “quoted”) — escaping happens on
 * render via the `e()` helper. Strips only angle brackets + control chars
 * that could break markup or enable tag injection. */
export function sanitizeText(text: unknown, maxLen: number): string {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLen);
}

/** Escape text for safe HTML interpolation (render-time). */
export function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}