import { describe, it, expect } from 'vitest';
import { validateUpload, sanitizeText, sanitizeFileName, MAX_UPLOAD_BYTES } from '../lib/security';

function png(): Buffer {
  // Minimal valid-looking PNG header (8 magic bytes suffice for our check).
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
}

function jpeg(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
}

function gif(): Buffer {
  return Buffer.from('GIF89a-1234', 'ascii');
}

function webp(): Buffer {
  return Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.alloc(4), Buffer.from('WEBP', 'ascii'), Buffer.alloc(4)]);
}

describe('validateUpload', () => {
  it('accepts a real PNG with .png extension', () => {
    expect(validateUpload(png(), 'photo.png')).toEqual({ ext: 'png' });
  });

  it('accepts jpg/jpeg', () => {
    expect(validateUpload(jpeg(), 'photo.jpg')?.ext).toBe('jpg');
    expect(validateUpload(jpeg(), 'photo.jpeg')?.ext).toBe('jpeg');
  });

  it('accepts gif and webp', () => {
    expect(validateUpload(gif(), 'anim.gif')?.ext).toBe('gif');
    expect(validateUpload(webp(), 'img.webp')?.ext).toBe('webp');
  });

  it('rejects SVG (XSS vector)', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(validateUpload(svg, 'evil.svg')).toBeNull();
  });

  it('rejects extension mismatch (fake .png containing HTML)', () => {
    const fake = Buffer.from('<html>hello</html>');
    expect(validateUpload(fake, 'fake.png')).toBeNull();
  });

  it('rejects executable files renamed to .png', () => {
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.from('this is a program', 'ascii')]);
    expect(validateUpload(exe, 'app.png')).toBeNull();
  });

  it('rejects empty and oversized files', () => {
    expect(validateUpload(Buffer.alloc(0), 'a.png')).toBeNull();
    expect(validateUpload(Buffer.alloc(MAX_UPLOAD_BYTES + 1), 'big.png')).toBeNull();
  });

  it('rejects unknown extension even with image bytes', () => {
    expect(validateUpload(png(), 'photo.txt')).toBeNull();
  });
});

describe('sanitizeText', () => {
  it('strips angle brackets but preserves quotes/apostrophes', () => {
    expect(sanitizeText('<script>alert(1)</script>', 500)).not.toContain('<');
    expect(sanitizeText('<script>alert(1)</script>', 500)).not.toContain('>');
    // O'Brien-style names and quoted text must survive; escaping happens on render.
    expect(sanitizeText('a"b\'c', 500)).toBe('a"b\'c');
    expect(sanitizeText("O'Brien “hello”", 500)).toBe("O'Brien “hello”");
  });

  it('truncates to max length', () => {
    expect(sanitizeText('x'.repeat(5000), 10)).toHaveLength(10);
  });

  it('rejects non-strings', () => {
    expect(sanitizeText(null as any, 10)).toBe('');
    expect(sanitizeText(42 as any, 10)).toBe('');
  });
});

describe('sanitizeFileName', () => {
  it('removes path separators and control chars', () => {
    expect(sanitizeFileName('../../etc/passwd')).not.toMatch(/[\\/]/);
    expect(sanitizeFileName('C:\\Windows\\System32\\cmd.exe')).not.toMatch(/[\\/]/);
  });

  it('keeps ordinary display characters', () => {
    expect(sanitizeFileName('My Photo (1).png')).toBe('My Photo (1).png');
  });

  it('falls back to a default for empty input', () => {
    expect(sanitizeFileName('')).toBe('file');
  });
});