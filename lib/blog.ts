/** Pure blog helpers (unit-tested, no I/O). */

export function slugify(title: unknown): string {
  const s = String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'post';
}

export function excerpt(body: unknown, maxLen = 160): string {
  const text = String(body || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/\s+$/, '') + '…';
}

export function readingMinutes(body: unknown): number {
  const words = String(body || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export interface PostInput {
  title: unknown;
  body: unknown;
  cover: unknown;
  published: unknown;
  slug?: unknown;
}

export function sanitizePostInput(raw: unknown): { ok: true; post: { title: string; body: string; cover: string; published: number; slug: string } } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Invalid post.' };
  const p = raw as Record<string, unknown>;
  const title = String(p.title || '').trim().slice(0, 140);
  if (!title) return { ok: false, error: 'Title is required.' };
  const body = String(p.body || '').slice(0, 50000);
  const cover = String(p.cover || '').slice(0, 500);
  if (cover && !/^(https?:\/\/|\/\/|\/|data:image\/)/i.test(cover)) {
    return { ok: false, error: 'Invalid cover image URL.' };
  }
  const published = p.published === true || p.published === 1 || p.published === '1' ? 1 : 0;
  const slug = slugify(p.slug || title);
  return { ok: true, post: { title, body, cover, published, slug } };
}
