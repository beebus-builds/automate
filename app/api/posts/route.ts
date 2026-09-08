import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { listPosts, savePost, deletePost } from '@/lib/db';
import { sanitizePostInput } from '@/lib/blog';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseTeacherId(value: unknown): number | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isInteger(n) && (n as number) > 0 ? (n as number) : null;
}

/**
 * GET ?teacherId= — public published posts (for embeds).
 * GET (no param, authed) — owner's drafts + published.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = parseTeacherId(searchParams.get('teacherId'));
    if (teacherId) {
      const posts = await listPosts(teacherId, true);
      return NextResponse.json({ posts: posts.map(p => ({ slug: p.slug, title: p.title, cover: p.cover, created_at: p.created_at })) });
    }
    const user = await getSessionUser();
    if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.json({ posts: await listPosts(user.id, false) });
  } catch {
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const rl = await rateLimit(`posts:${user.id}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too fast. Slow down.' }, { status: 429 });
  const body = await request.json().catch(() => null);
  const parsed = sanitizePostInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const post = await savePost({ teacher_id: user.id, ...parsed.post });
  return NextResponse.json({ ok: true, post });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = parseInt(body?.id, 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const parsed = sanitizePostInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const post = await savePost({ id, teacher_id: user.id, ...parsed.post });
    return NextResponse.json({ ok: true, post });
  } catch {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '', 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const ok = await deletePost(id, user.id);
  if (!ok) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
