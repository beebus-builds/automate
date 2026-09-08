import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { recordView, getViewStats } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseTeacherId(value: unknown): number | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isInteger(n) && (n as number) > 0 ? (n as number) : null;
}

// Public beacon — generated sites report page views (cheap, rate-limited).
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(`views:${clientIp(request.headers)}`, 120, 60_000);
    if (!rl.allowed) return NextResponse.json({ ok: true });
    const body = await request.json().catch(() => null);
    const teacherId = parseTeacherId(body?.teacherId);
    if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
    const pagePath = String(body?.path || '/').slice(0, 200);
    await recordView(teacherId, pagePath);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

// Owner-only stats for the dashboard.
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const teacherId = parseTeacherId(searchParams.get('teacherId'));
    if (!teacherId || teacherId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365);
    return NextResponse.json(await getViewStats(teacherId, days));
  } catch {
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
