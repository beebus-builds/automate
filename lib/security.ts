import path from 'path';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
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

export function sanitizeFileName(name: string): string {
  const clean = (name || '')
    .replace(/[\\/]/g, '')
    .replace(/[^\w.\- (),&+']/g, '')
    .trim()
    .slice(0, 100);
  return clean || 'file';
}

/** HTML-aware sanitizer for user text stored and re-rendered later. */
export function sanitizeText(text: unknown, maxLen: number): string {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>"'`]/g, '').trim().slice(0, maxLen);
}