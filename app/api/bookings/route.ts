import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getSlots, createBooking, listBookings, setBookingStatus, deleteBooking,
  getTeacherSettings,
} from '@/lib/db';
import { notifyTeacher } from '@/lib/mail';
import { validateBooking } from '@/lib/bookings';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseTeacherId(value: unknown): number | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isInteger(n) && (n as number) > 0 ? (n as number) : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * GET ?teacherId= — public: weekly slots + taken times (for the booking form).
 * GET (no param, authed) — owner's full booking list.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = parseTeacherId(searchParams.get('teacherId'));
    if (teacherId) {
      const [slots, bookings] = await Promise.all([
        getSlots(teacherId),
        listBookings(teacherId, ['pending', 'confirmed']),
      ]);
      const taken = bookings
        .filter(b => b.date >= todayStr())
        .map(b => ({ date: b.date, time: b.time }));
      return NextResponse.json({ slots, taken });
    }
    const user = await getSessionUser();
    if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const [slots, bookings] = await Promise.all([getSlots(user.id), listBookings(user.id)]);
    return NextResponse.json({ slots, bookings });
  } catch {
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 });
  }
}

// Public — visitors request a booking slot.
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(`book:${clientIp(request.headers)}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    const body = await request.json().catch(() => null);
    const teacherId = parseTeacherId(body?.teacherId);
    const name = sanitizeText(body?.name, 80);
    const email = sanitizeText(body?.email, 120).toLowerCase();
    const date = String(body?.date || '');
    const time = String(body?.time || '');
    const note = sanitizeText(body?.note, 500);
    if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    const [slots, existing] = await Promise.all([
      getSlots(teacherId),
      listBookings(teacherId, ['pending', 'confirmed']),
    ]);
    if (slots.length === 0) {
      return NextResponse.json({ error: 'This teacher is not taking bookings right now.' }, { status: 400 });
    }
    const check = validateBooking(slots, existing, date, time);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    const booking = await createBooking({ teacher_id: teacherId, name, email, date, time, note });
    getTeacherSettings(teacherId)
      .then(s => notifyTeacher(s, 'booking', `New booking request: ${date} at ${time}`, `From: ${name} <${email}>\nWhen: ${date} at ${time}\nNote: ${note || '—'}\n\nConfirm it in your dashboard.`))
      .catch(() => {});
    return NextResponse.json({ ok: true, id: booking.id });
  } catch {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

// Owner — confirm / cancel.
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = parseInt(body?.id, 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const ok = await setBookingStatus(id, user.id, String(body?.status || ''));
  if (!ok) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '', 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const ok = await deleteBooking(id, user.id);
  if (!ok) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
