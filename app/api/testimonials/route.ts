import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { addTestimonial, listTestimonials, setTestimonialStatus, deleteTestimonial } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseTeacherId(value: unknown): number | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isInteger(n) && (n as number) > 0 ? (n as number) : null;
}

// Owner — full moderation list.
export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ testimonials: await listTestimonials(user.id, false) });
}

// Public — visitors submit a testimonial (held for moderation).
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(`testi:${clientIp(request.headers)}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too fast. Slow down.' }, { status: 429 });
    const body = await request.json().catch(() => null);
    const teacherId = parseTeacherId(body?.teacherId);
    const name = sanitizeText(body?.name, 60);
    const text = sanitizeText(body?.text, 800);
    const context = sanitizeText(body?.context, 120);
    if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'Testimonial is required.' }, { status: 400 });
    const t = await addTestimonial(teacherId, name, text, context);
    return NextResponse.json({ ok: true, id: t.id });
  } catch {
    return NextResponse.json({ error: 'Failed to save testimonial' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = parseInt(body?.id, 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const ok = await setTestimonialStatus(id, user.id, String(body?.status || ''));
  if (!ok) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '', 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const ok = await deleteTestimonial(id, user.id);
  if (!ok) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
