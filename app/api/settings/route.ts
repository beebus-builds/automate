import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getTeacherSettings, saveTeacherSettings } from '@/lib/db';
import { publicMailState } from '@/lib/mail';
import { sanitizeText } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Notification + mail provider settings. Secrets are never echoed back.
export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const s = await getTeacherSettings(user.id);
  return NextResponse.json({
    ...publicMailState(s),
    hasResendKey: s.resend_key.length > 0,
    hasSmtpPass: s.smtp_pass.length > 0,
    smtpHost: s.smtp_host,
    smtpPort: s.smtp_port,
    smtpUser: s.smtp_user,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.notify_email !== undefined) {
    const email = sanitizeText(body.notify_email, 160).toLowerCase();
    if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Invalid notification email.' }, { status: 400 });
    patch.notify_email = email;
  }
  if (body.notify_on_message !== undefined) patch.notify_on_message = !!body.notify_on_message;
  if (body.notify_on_booking !== undefined) patch.notify_on_booking = !!body.notify_on_booking;
  if (body.mail_provider !== undefined) {
    if (!['', 'resend', 'smtp'].includes(String(body.mail_provider))) {
      return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 });
    }
    patch.mail_provider = String(body.mail_provider);
  }
  if (body.mail_from !== undefined) patch.mail_from = sanitizeText(body.mail_from, 160);
  // Secrets: only overwrite when a non-empty value is supplied (blank = keep).
  if (typeof body.resend_key === 'string' && body.resend_key) patch.resend_key = body.resend_key.slice(0, 200);
  if (typeof body.smtp_host === 'string') patch.smtp_host = body.smtp_host.slice(0, 200);
  if (body.smtp_port !== undefined) patch.smtp_port = Number(body.smtp_port) || 587;
  if (typeof body.smtp_user === 'string') patch.smtp_user = body.smtp_user.slice(0, 200);
  if (typeof body.smtp_pass === 'string' && body.smtp_pass) patch.smtp_pass = body.smtp_pass.slice(0, 300);

  const saved = await saveTeacherSettings(user.id, patch);
  return NextResponse.json({ ok: true, ...publicMailState(saved) });
}
