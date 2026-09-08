import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSlots, saveSlots } from '@/lib/db';
import { sanitizeSlots } from '@/lib/bookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Owner-only weekly availability for the bookings dashboard.
export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ slots: await getSlots(user.id) });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = sanitizeSlots(body?.slots);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await saveSlots(user.id, parsed.slots);
  return NextResponse.json({ ok: true, slots: parsed.slots });
}
