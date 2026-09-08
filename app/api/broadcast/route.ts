import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { listSubscribers, getTeacherSettings } from '@/lib/db';
import { sendTeacherMail, mailConfigured } from '@/lib/mail';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Owner — email all newsletter subscribers (uses the teacher's mail setup).
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const rl = await rateLimit(`broadcast:${user.id}`, 3, 60 * 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Limit: 3 broadcasts per hour.' }, { status: 429 });

  const body = await request.json().catch(() => null);
  const subject = sanitizeText(body?.subject, 140);
  const text = sanitizeText(body?.text, 5000);
  if (!subject) return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });

  const settings = await getTeacherSettings(user.id);
  if (!mailConfigured(settings)) {
    return NextResponse.json({ error: 'Set up a mail provider first (My Site → Email alerts).' }, { status: 400 });
  }
  const subs = await listSubscribers(user.id);
  if (!subs.length) return NextResponse.json({ error: 'No subscribers yet.' }, { status: 400 });

  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      const ok = await sendTeacherMail(
        { ...settings, notify_email: s.email },
        subject,
        `${text}\n\n— ${user.name}\n(Unsubscribing: reply to this email)`
      );
      if (ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return NextResponse.json({ ok: true, sent, failed, total: subs.length });
}
