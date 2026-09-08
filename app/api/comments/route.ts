import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { addComment, listComments, setCommentStatus, deleteComment, getPost } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseTeacherId(value: unknown): number | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isInteger(n) && (n as number) > 0 ? (n as number) : null;
}

function cleanSlug(value: unknown): string {
  return String(value || '').replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

/**
 * GET ?teacherId=&slug= — public approved comments for a post.
 * GET (authed, own teacherId) — all comments for moderation.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = parseTeacherId(searchParams.get('teacherId'));
    const slug = cleanSlug(searchParams.get('slug'));
    if (!teacherId || !slug) return NextResponse.json({ error: 'teacherId and slug required' }, { status: 400 });
    const user = await getSessionUser().catch(() => null);
    const owner = !!user?.id && user.id === teacherId;
    const comments = await listComments(teacherId, slug, !owner);
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

// Public — visitors comment on a published post (held for moderation).
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(`comment:${clientIp(request.headers)}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too fast. Slow down.' }, { status: 429 });
    const body = await request.json().catch(() => null);
    const teacherId = parseTeacherId(body?.teacherId);
    const slug = cleanSlug(body?.slug);
    const name = sanitizeText(body?.name, 60);
    const text = sanitizeText(body?.text, 1000);
    if (!teacherId || !slug) return NextResponse.json({ error: 'teacherId and slug required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'Comment is required.' }, { status: 400 });
    const post = await getPost(teacherId, slug);
    if (!post || !post.published) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    const comment = await addComment(teacherId, slug, name, text);
    return NextResponse.json({ ok: true, id: comment.id, status: comment.status });
  } catch {
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
  }
}

// Owner — approve / unapprove.
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = parseInt(body?.id, 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const ok = await setCommentStatus(id, user.id, String(body?.status || ''));
  if (!ok) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '', 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const ok = await deleteComment(id, user.id);
  if (!ok) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
