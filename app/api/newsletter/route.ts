import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { addSubscriber, listSubscribers, deleteSubscriber } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseTeacherId(value: unknown): number | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isInteger(n) && (n as number) > 0 ? (n as number) : null;
}

// Owner — subscriber list for the Audience tab.
export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ subscribers: await listSubscribers(user.id) });
}

// Public — visitors subscribe from the newsletter widget.
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(`news:${clientIp(request.headers)}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too fast. Slow down.' }, { status: 429 });
    const body = await request.json().catch(() => null);
    const teacherId = parseTeacherId(body?.teacherId);
    const email = sanitizeText(body?.email, 160).toLowerCase();
    if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    const res = await addSubscriber(teacherId, email);
    return NextResponse.json({ ok: true, duplicate: !!res.duplicate });
  } catch {
    return NextResponse.json({ error: 'Subscribe failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '', 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const ok = await deleteSubscriber(id, user.id);
  if (!ok) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
