import { NextRequest, NextResponse } from 'next/server';
import { getHistory, pushHistory, popHistory } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function GET() {
  return NextResponse.json(await getHistory());
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const rl = await rateLimit(`history:${user.id}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const data = await request.json();
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    await pushHistory(data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const rl = await rateLimit(`history-del:${clientIp(request.headers)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const prev = await popHistory();
  return NextResponse.json(prev || {});
}